const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const deployed = JSON.parse(fs.readFileSync("./data/deployed.json", "utf8"));
  const proof = JSON.parse(fs.readFileSync("./build/proof.json", "utf8"));
  const pub = JSON.parse(fs.readFileSync("./build/public.json", "utf8"));

  const registry = await hre.ethers.getContractAt("Registry", deployed.registry);
  const orderGateway = await hre.ethers.getContractAt("OrderGateway", deployed.orderGateway);

  console.log("caller:", signer.address);
  console.log("before login:", await registry.isLoggedIn(signer.address));

  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]]
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];
  const input = [pub[0], pub[1]];

  const tx = await registry.verifyLogin(a, b, c, input);
  await tx.wait();

 try {
  await registry.callStatic.verifyLogin(a, b, c, input);
  console.log("replay unexpectedly allowed");
} catch (e) {
  console.log("replay blocked:", e.error?.message || e.reason || e.message);
}

  console.log("after login:", await registry.isLoggedIn(signer.address));
  console.log("session expires:", (await registry.sessionExpiresAt(signer.address)).toString());

  const orderTx = await orderGateway.submitOrder(1000);
  await orderTx.wait();

  console.log("order submitted");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});