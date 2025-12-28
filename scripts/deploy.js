async function main() {
  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy();

  // ✅ Ethers v6 replacement for .deployed()
  await election.waitForDeployment();

  console.log("Election deployed to:", election.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
