import { useEffect, useState } from "react";
import { ethers } from "ethers";
import ElectionABI from "./abi/Election.json";
import { CONTRACT_ADDRESS } from "./config";

/* Helper for Ethers v6 revert messages */
function getRevertMessage(err) {
  return (
    err?.info?.error?.message ||
    err?.error?.message ||
    err?.reason ||
    "Transaction failed"
  );
}

export default function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);

  const [parties, setParties] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [partyName, setPartyName] = useState("");
  const [votingActive, setVotingActive] = useState(false);

  const [age, setAge] = useState("");
  const [isRegisteredVoter, setIsRegisteredVoter] = useState(false);

  const [winner, setWinner] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  /*Wallet Connection*/

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const electionContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ElectionABI,
      signer
    );

    const admin = await electionContract.ElectionCommission();
    const active = await electionContract.votingActive();
    const voter = await electionContract.voters(address);

    setAccount(address);
    setContract(electionContract);
    setIsAdmin(admin.toLowerCase() === address.toLowerCase());
    setVotingActive(active);
    setIsRegisteredVoter(voter.isRegistered);
  }

  /* Load Parties */

  async function loadParties(c) {
    const count = await c.getPartiesCount();
    const list = [];

    for (let i = 0; i < Number(count); i++) {
      const party = await c.politicalParties(i);
      list.push({
        index: i,
        name: party.name,
        votes: party.totalVotes,
      });
    }

    setParties(list);
  }

  /* Load Results */

  async function loadResult(c) {
    try {
      const result = await c.getWinner();
      setWinner({
        name: result[0],
        votes: result[1],
        isTie: result[2],
      });
    } catch {
      setWinner(null);
    }
  }

  useEffect(() => {
    if (contract) {
      loadParties(contract);
      if (!votingActive) loadResult(contract);
    }
  }, [contract, votingActive]);

  /* Admin Funcs */

  async function registerParty() {
    if (!partyName || votingActive) return;

    try {
      setError("");
      setLoading("Registering party...");
      const tx = await contract.registerParty(partyName);
      await tx.wait();
      setPartyName("");
      loadParties(contract);
    } catch (err) {
      setError(getRevertMessage(err));
    } finally {
      setLoading("");
    }
  }

  async function startVoting() {
    try {
      setError("");
      setLoading("Starting voting...");
      const tx = await contract.startVoting();
      await tx.wait();
      setVotingActive(true);
      setWinner(null);
    } catch (err) {
      setError(getRevertMessage(err));
    } finally {
      setLoading("");
    }
  }

  async function endVoting() {
    try {
      setError("");
      setLoading("Ending voting...");
      const tx = await contract.endVoting();
      await tx.wait();
      setVotingActive(false);
      loadResult(contract);
    } catch (err) {
      setError(getRevertMessage(err));
    } finally {
      setLoading("");
    }
  }

  /* Voter Funcs */

  async function registerVoter() {
    if (!age) return;

    try {
      setError("");
      setLoading("Registering voter...");
      const tx = await contract.registerVoter(age);
      await tx.wait();
      setIsRegisteredVoter(true);
    } catch (err) {
      setError(getRevertMessage(err));
    } finally {
      setLoading("");
    }
  }

  async function castVote(index) {
    try {
      setError("");
      setLoading("Casting vote...");
      const tx = await contract.castVote(index);
      await tx.wait();
      loadParties(contract);
    } catch (err) {
      setError(getRevertMessage(err));
    } finally {
      setLoading("");
    }
  }

  /* UI */

  return (
    <div className="min-h-screen bg-gray-100 p-10 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">
        🗳️ Decentralized Voting dApp
      </h1>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <p className="text-xs font-mono mb-4">{account}</p>

          {loading && (
            <p className="mb-3 text-blue-600 font-semibold">
              ⏳ {loading}
            </p>
          )}

          {error && (
            <p className="mb-3 text-red-600 font-semibold">
              ⚠️ {error}
            </p>
          )}

          {/* ADMIN PANEL */}
          {isAdmin && (
            <div className="bg-white p-4 rounded shadow w-full max-w-md mb-6">
              <h2 className="font-semibold mb-3">Admin Panel</h2>

              <input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Party name"
                className="border p-2 w-full mb-2"
              />

              <button
                disabled={votingActive || loading}
                onClick={registerParty}
                className={`w-full py-2 rounded text-white mb-3 ${
                  votingActive
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Register Party
              </button>

              {!votingActive ? (
                <button
                  onClick={startVoting}
                  className="bg-blue-600 text-white py-2 rounded w-full"
                >
                  Start Voting
                </button>
              ) : (
                <button
                  onClick={endVoting}
                  className="bg-red-600 text-white py-2 rounded w-full"
                >
                  End Voting
                </button>
              )}
            </div>
          )}

          {/* VOTER REGISTRATION */}
          <div className="bg-white p-4 rounded shadow w-full max-w-md mb-6">
            <h2 className="font-semibold mb-3">Voter Registration</h2>

            {isRegisteredVoter ? (
              <p className="text-green-600">
                ✅ You are registered to vote
              </p>
            ) : (
              <>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter age"
                  className="border p-2 w-full mb-2"
                />
                <button
                  onClick={registerVoter}
                  className="bg-blue-600 text-white py-2 rounded w-full"
                >
                  Register as Voter
                </button>
              </>
            )}
          </div>

          {/* PARTIES & VOTING */}
          <h2 className="text-xl font-semibold mb-4">
            Registered Parties
          </h2>

          {parties.length === 0 ? (
            <p>No parties registered.</p>
          ) : (
            <div className="grid gap-4 w-full max-w-md mb-8">
              {parties.map((party) => (
                <div
                  key={party.index}
                  className="bg-white p-4 rounded shadow flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{party.name}</p>
                    <p className="text-sm text-gray-500">
                      Votes: {party.votes.toString()}
                    </p>
                  </div>

                  <button
                    disabled={
                      !votingActive ||
                      !isRegisteredVoter ||
                      loading
                    }
                    onClick={() => castVote(party.index)}
                    className={`px-3 py-1 rounded text-white ${
                      votingActive && isRegisteredVoter
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Vote
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* RESULTS */}
          {!votingActive && winner && (
            <div className="bg-white p-4 rounded shadow w-full max-w-md">
              <h2 className="text-xl font-semibold mb-2">
                🏁 Election Result
              </h2>

              {winner.isTie ? (
                <p className="text-orange-600 font-semibold">
                  🤝 Election ended in a tie (Votes: {winner.votes.toString()})
                </p>
              ) : winner.name === "" ? (
                <p className="text-gray-600">
                  No votes were cast.
                </p>
              ) : (
                <p className="text-green-700 font-semibold">
                  🏆 Winner: {winner.name} ({winner.votes.toString()} votes)
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}