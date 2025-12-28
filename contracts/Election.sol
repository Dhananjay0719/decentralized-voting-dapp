// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Election {
    address public ElectionCommission;
    bool public votingActive;

    constructor(){
        ElectionCommission=msg.sender;
    }

    struct Party {
        string name;
        uint totalVotes;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint age;
    }

    mapping(address=> Voter) public voters;
    mapping(string => bool) public partyRegistered;

    Party[] public politicalParties;

    modifier onlyElectionCommission() {
    require(msg.sender == ElectionCommission, "You are not Election Commission");
    _;
    }

    event VotingStarted();
    event VotingEnded();
    event PartyRegistered(string name);
    event VoterRegistered(address voter);
    event VoteCast(address voter, uint partyIndex);

    function startVoting() public onlyElectionCommission {
        require(!votingActive, "Voting already active");
        require(politicalParties.length > 0, "No parties registered");
        votingActive = true;
        emit VotingStarted();
    }

    function endVoting() public onlyElectionCommission {
        require(votingActive, "Voting not active");
        votingActive = false;
        emit VotingEnded();
    }

    function registerParty (string memory _name) public onlyElectionCommission{
        require(!votingActive,"You cannot add parties mid election");
        require(!partyRegistered[_name],"Party is already registered");
        partyRegistered[_name]=true;
        politicalParties.push(Party(_name,0));
        emit PartyRegistered(_name);
    }

    function registerVoter(uint _age) public {
    require(voters[msg.sender].isRegistered== false, "Already registered");
    require(_age >= 18, "Not eligible");
    voters[msg.sender] = Voter(true, false, _age);
    emit VoterRegistered(msg.sender);
    }

    function castVote(uint partyIndex) public {

    require(votingActive, "Voting is not active");
    require(voters[msg.sender].isRegistered, "Voter is not registered");
    require(!voters[msg.sender].hasVoted, "Voter has already voted");
    require(partyIndex < politicalParties.length, "Invalid party index");

    voters[msg.sender].hasVoted = true;
    politicalParties[partyIndex].totalVotes++;
    emit VoteCast(msg.sender, partyIndex);
    }

    function getPartiesCount() public view returns (uint) {
    return politicalParties.length;
    }

    function getWinner() public view returns (string memory winnerName, uint winnerVotes, bool isTie) {
        require(!votingActive, "Voting still active");
        require(politicalParties.length > 0, "No parties");

        uint winningIndex = 0;
        bool tie = false;
        for (uint i = 1; i < politicalParties.length; i++) {
            if (politicalParties[i].totalVotes > politicalParties[winningIndex].totalVotes) {
                winningIndex = i;
                tie = false; 
            } 
            else if (politicalParties[i].totalVotes ==politicalParties[winningIndex].totalVotes) {
                tie = true;
            }
        }

        if (tie) 
        { return ("", politicalParties[winningIndex].totalVotes, true); }
        
        Party memory winner = politicalParties[winningIndex];
        return (winner.name, winner.totalVotes, false);
    }
}