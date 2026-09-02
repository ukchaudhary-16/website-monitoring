const mongoose = require("mongoose");
const dns = require("dns");

// Some Windows setups leave Node's internal DNS resolver without a usable server,
// so `mongodb+srv://` fails with `querySrv ECONNREFUSED` even though normal
// browsing works. Setting explicit resolvers fixes the SRV/TXT lookups.
// Override with DNS_SERVERS="1.1.1.1,8.8.8.8" or disable with DNS_SERVERS="off".
function fixDnsResolvers() {
  const raw = process.env.DNS_SERVERS ?? "8.8.8.8,1.1.1.1";
  if (raw === "off") return;
  const servers = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!servers.length) return;
  try {
    dns.setServers(servers);
    console.log("[db] DNS resolvers set to:", servers.join(", "));
  } catch (e) {
    console.warn("[db] could not set DNS resolvers:", e.message);
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/depin_monitor";
  if (uri.startsWith("mongodb+srv://")) fixDnsResolvers();

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log("[db] connected");
  return mongoose.connection;
}

module.exports = { connectDB };
