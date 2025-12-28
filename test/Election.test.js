const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Election Contract", function () {
  let Election;
  let election;
  let owner;
  let voter1;
  let voter2;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();

    Election = await ethers.getContractFactory("Election");
    election = await Election.deploy();
    await election.waitForDeployment();
  });

  /* -------------------------------------------------- */
  /*                    ADMIN TESTS                    */
  /* -------------------------------------------------- */

  it("should set deployer as Election Commission", async function () {
    expect(await election.ElectionCommission()).to.equal(owner.address);
  });

  it("should not allow non-admin to start voting", async function () {
    await expect(
      election.connect(voter1).startVoting()
    ).to.be.revertedWith("You are not Election Commission");
  });

  /* -------------------------------------------------- */
  /*                PARTY REGISTRATION                 */
  /* -------------------------------------------------- */

  it("should allow admin to register a party", async function () {
    await election.registerParty("Party A");
    expect(await election.getPartiesCount()).to.equal(1);
  });

  it("should not allow duplicate party registration", async function () {
    await election.registerParty("Party A");

    await expect(
      election.registerParty("Party A")
    ).to.be.revertedWith("Party is already registered");
  });

  it("should not allow party registration during voting", async function () {
    await election.registerParty("Party A");
    await election.startVoting();

    await expect(
      election.registerParty("Party B")
    ).to.be.revertedWith("You cannot add parties mid election");
  });

  /* -------------------------------------------------- */
  /*               VOTER REGISTRATION                  */
  /* -------------------------------------------------- */

  it("should allow a user to register as voter", async function () {
    await election.connect(voter1).registerVoter(20);
    const voter = await election.voters(voter1.address);
    expect(voter.isRegistered).to.equal(true);
  });

  it("should not allow voter below 18", async function () {
    await expect(
      election.connect(voter1).registerVoter(16)
    ).to.be.revertedWith("Not eligible");
  });

  /* -------------------------------------------------- */
  /*                    VOTING TESTS                   */
  /* -------------------------------------------------- */

  it("should not allow voting before voting starts", async function () {
    await election.registerParty("Party A");
    await election.connect(voter1).registerVoter(22);

    await expect(
      election.connect(voter1).castVote(0)
    ).to.be.revertedWith("Voting is not active");
  });

  it("should allow a registered voter to vote once", async function () {
    await election.registerParty("Party A");
    await election.startVoting();

    await election.connect(voter1).registerVoter(22);
    await election.connect(voter1).castVote(0);

    const party = await election.politicalParties(0);
    expect(party.totalVotes).to.equal(1);
  });

  it("should not allow double voting", async function () {
    await election.registerParty("Party A");
    await election.startVoting();

    await election.connect(voter1).registerVoter(22);
    await election.connect(voter1).castVote(0);

    await expect(
      election.connect(voter1).castVote(0)
    ).to.be.revertedWith("Voter has already voted");
  });

  it("should not allow invalid party index", async function () {
    await election.registerParty("Party A");
    await election.startVoting();
    await election.connect(voter1).registerVoter(22);

    await expect(
      election.connect(voter1).castVote(5)
    ).to.be.revertedWith("Invalid party index");
  });

  /* -------------------------------------------------- */
  /*                TIE & RESULT TESTS                 */
  /* -------------------------------------------------- */

  it("should return tie when votes are equal", async function () {
    await election.registerParty("Party A");
    await election.registerParty("Party B");

    await election.connect(voter1).registerVoter(22);
    await election.connect(voter2).registerVoter(25);

    await election.startVoting();

    await election.connect(voter1).castVote(0);
    await election.connect(voter2).castVote(1);

    await election.endVoting();

    const result = await election.getWinner();
    expect(result.isTie).to.equal(true);
    expect(result.winnerName).to.equal("");
  });

  /* -------------------------------------------------- */
  /*                   EVENT TESTS                     */
  /* -------------------------------------------------- */

  it("should emit VotingStarted event", async function () {
    await election.registerParty("Party A");

    await expect(election.startVoting())
      .to.emit(election, "VotingStarted");
  });

  it("should emit VoteCast event", async function () {
    await election.registerParty("Party A");
    await election.startVoting();

    await election.connect(voter1).registerVoter(22);

    await expect(
      election.connect(voter1).castVote(0)
    ).to.emit(election, "VoteCast");
  });
});