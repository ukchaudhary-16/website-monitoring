// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MonitorToken.sol";

/**
 * @title MonitorRegistry
 * @dev Manages node registration, staking, job assignment, result submission, and consensus settlement
 * Implements majority-based consensus: nodes that agree with the majority are rewarded, outliers are slashed
 */
contract MonitorRegistry is Ownable, ReentrancyGuard {
    MonitorToken public token;

    // Staking configuration
    uint256 public minimumStake = 100 * 10**18; // 100 tokens (18 decimals)
    uint256 public slashPercentage = 10; // 10% slashed for dishonest submissions
    uint256 public rewardPerSubmission = 1 * 10**18; // 1 token per honest submission
    uint256 public unbondingPeriod = 7 days;

    // Node registration
    struct Node {
        address owner;
        string region;
        uint256 stakedAmount;
        uint256 registrationTime;
        bool active;
        uint256 unbondingTime; // When the node can withdraw after deactivation
        uint256 totalEarnings;
        uint256 totalJobs;
    }

    mapping(address => Node) public nodes;
    address[] public nodeList;
    mapping(string => address[]) public nodesByRegion; // Region -> array of node addresses

    // Job and result submission tracking
    struct Job {
        uint256 id;
        string targetUrl;
        string region;
        uint256 createdAt;
        bool settled;
        uint8 result; // 1 = up, 0 = down, 2 = unknown
    }

    struct Submission {
        address node;
        uint8 result; // 1 = up, 0 = down
        bytes32 resultHash;
        bytes signature;
        uint256 timestamp;
    }

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Submission[]) public jobSubmissions;
    uint256 public jobCounter = 0;

    // Events
    event NodeRegistered(address indexed node, string region, uint256 stake);
    event NodeDeactivated(address indexed node);
    event NodeStakeWithdrawn(address indexed node, uint256 amount);
    event JobCreated(uint256 indexed jobId, string targetUrl, string region);
    event ResultSubmitted(uint256 indexed jobId, address indexed node, uint8 result);
    event ConsensusSettled(uint256 indexed jobId, uint8 majorityResult, uint256 rewarded, uint256 slashed);
    event NodeSlashed(address indexed node, uint256 amount);
    event NodeRewarded(address indexed node, uint256 amount);

    constructor(address _tokenAddress) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Invalid token address");
        token = MonitorToken(_tokenAddress);
    }

    // ============ Owner configuration ============

    function setMinimumStake(uint256 _v) external onlyOwner {
        minimumStake = _v;
    }

    function setSlashPercentage(uint256 _v) external onlyOwner {
        require(_v <= 100, "Invalid percentage");
        slashPercentage = _v;
    }

    function setRewardPerSubmission(uint256 _v) external onlyOwner {
        rewardPerSubmission = _v;
    }

    function setUnbondingPeriod(uint256 _v) external onlyOwner {
        unbondingPeriod = _v;
    }

    /**
     * @dev Register a new node with stake
     * Node must approve tokens before calling this
     * @param _region Geographic region this node will monitor from
     */
    function registerNode(string memory _region) external {
        require(bytes(_region).length > 0, "Region cannot be empty");
        require(nodes[msg.sender].owner == address(0), "Node already registered");

        require(
            token.allowance(msg.sender, address(this)) >= minimumStake &&
                token.balanceOf(msg.sender) >= minimumStake,
            "Insufficient allowance or balance"
        );

        // Transfer stake from node to contract
        require(
            token.transferFrom(msg.sender, address(this), minimumStake),
            "Stake transfer failed"
        );

        // Create node record
        nodes[msg.sender] = Node({
            owner: msg.sender,
            region: _region,
            stakedAmount: minimumStake,
            registrationTime: block.timestamp,
            active: true,
            unbondingTime: 0,
            totalEarnings: 0,
            totalJobs: 0
        });

        // Add to node list and region index
        nodeList.push(msg.sender);
        nodesByRegion[_region].push(msg.sender);

        emit NodeRegistered(msg.sender, _region, minimumStake);
    }

    /**
     * @dev Deactivate a node (start unbonding period)
     * Node cannot submit results after deactivation
     */
    function deactivateNode() external {
        require(nodes[msg.sender].owner != address(0), "Node not registered");
        require(nodes[msg.sender].active, "Node already inactive");

        nodes[msg.sender].active = false;
        nodes[msg.sender].unbondingTime = block.timestamp + unbondingPeriod;

        emit NodeDeactivated(msg.sender);
    }

    /**
     * @dev Withdraw stake after unbonding period has passed
     */
    function withdrawStake() external nonReentrant {
        Node storage node = nodes[msg.sender];
        require(node.owner != address(0), "Node not registered");
        require(!node.active, "Node must be deactivated first");
        require(
            block.timestamp >= node.unbondingTime,
            "Unbonding period not complete"
        );

        uint256 amount = node.stakedAmount;
        node.stakedAmount = 0;
        delete nodes[msg.sender];

        require(token.transfer(msg.sender, amount), "Withdrawal failed");

        emit NodeStakeWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Create a new monitoring job (called by backend)
     * @param _targetUrl URL to monitor
     * @param _region Target region for nodes
     */
    function createJob(string memory _targetUrl, string memory _region) external onlyOwner {
        require(bytes(_targetUrl).length > 0, "URL cannot be empty");

        uint256 jobId = jobCounter++;
        jobs[jobId] = Job({
            id: jobId,
            targetUrl: _targetUrl,
            region: _region,
            createdAt: block.timestamp,
            settled: false,
            result: 2 // unknown
        });

        emit JobCreated(jobId, _targetUrl, _region);
    }

    /**
     * @dev Submit a monitoring result for a job
     * @param _jobId Job ID
     * @param _result 1 = up, 0 = down
     * @param _resultHash Hash of the detailed result data
     * @param _signature Node's signature over the result
     */
    function submitResult(
        uint256 _jobId,
        uint8 _result,
        bytes32 _resultHash,
        bytes calldata _signature
    ) external {
        require(jobs[_jobId].createdAt != 0, "Job does not exist");
        require(!jobs[_jobId].settled, "Job already settled");
        require(nodes[msg.sender].owner != address(0), "Node not registered");
        require(nodes[msg.sender].active, "Node is not active");
        require(_result <= 1, "Invalid result (must be 0 or 1)");

        // NOTE: signature is stored for off-chain auditing. Rigorous on-chain
        // ecrecover verification is a future hardening step.

        // Record submission
        jobSubmissions[_jobId].push(Submission({
            node: msg.sender,
            result: _result,
            resultHash: _resultHash,
            signature: _signature,
            timestamp: block.timestamp
        }));

        nodes[msg.sender].totalJobs++;

        emit ResultSubmitted(_jobId, msg.sender, _result);
    }

    /**
     * @dev Settle consensus for a job
     * Determines the majority result and rewards/slashes nodes accordingly
     * @param _jobId Job ID to settle
     */
    function settleConsensus(uint256 _jobId) external onlyOwner nonReentrant {
        require(jobs[_jobId].createdAt != 0, "Job does not exist");
        require(!jobs[_jobId].settled, "Job already settled");

        Submission[] storage submissions = jobSubmissions[_jobId];
        require(submissions.length >= 3, "Insufficient submissions for consensus (need >= 3)");

        // Count votes for each result
        uint256 upVotes = 0;
        uint256 downVotes = 0;

        for (uint256 i = 0; i < submissions.length; i++) {
            if (submissions[i].result == 1) {
                upVotes++;
            } else {
                downVotes++;
            }
        }

        // Determine majority result
        uint8 majorityResult;
        if (upVotes > downVotes) {
            majorityResult = 1; // Up
        } else {
            majorityResult = 0; // Down
        }

        jobs[_jobId].settled = true;
        jobs[_jobId].result = majorityResult;

        // Reward nodes that agree with majority, slash outliers
        uint256 rewardedCount = 0;
        uint256 slashedCount = 0;

        for (uint256 i = 0; i < submissions.length; i++) {
            address nodeAddr = submissions[i].node;

            if (submissions[i].result == majorityResult) {
                // Reward honest node
                token.mint(nodeAddr, rewardPerSubmission);
                nodes[nodeAddr].totalEarnings += rewardPerSubmission;
                rewardedCount++;

                emit NodeRewarded(nodeAddr, rewardPerSubmission);
            } else {
                // Slash dishonest node
                uint256 slashAmount = (nodes[nodeAddr].stakedAmount * slashPercentage) / 100;
                nodes[nodeAddr].stakedAmount -= slashAmount;
                // Staked tokens are held by this contract; burn them from our own balance
                token.burnFrom(address(this), slashAmount);
                slashedCount++;

                emit NodeSlashed(nodeAddr, slashAmount);
            }
        }

        emit ConsensusSettled(_jobId, majorityResult, rewardedCount, slashedCount);
    }

    // ============ View Functions ============

    /**
     * @dev Get all active nodes
     */
    function getNodeCount() external view returns (uint256) {
        return nodeList.length;
    }

    /**
     * @dev Get nodes in a specific region
     */
    function getNodesByRegion(string memory _region)
        external
        view
        returns (address[] memory)
    {
        return nodesByRegion[_region];
    }

    /**
     * @dev Get node details
     */
    function getNode(address _nodeAddress) external view returns (Node memory) {
        return nodes[_nodeAddress];
    }

    /**
     * @dev Get job details
     */
    function getJob(uint256 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }

    /**
     * @dev Get all submissions for a job
     */
    function getJobSubmissions(uint256 _jobId)
        external
        view
        returns (Submission[] memory)
    {
        return jobSubmissions[_jobId];
    }

    /**
     * @dev Get submission count for a job
     */
    function getSubmissionCount(uint256 _jobId) external view returns (uint256) {
        return jobSubmissions[_jobId].length;
    }
}
