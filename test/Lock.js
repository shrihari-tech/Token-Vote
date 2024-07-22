// test/TokenizedVotingSystem.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenizedVotingSystem", function () {
    let TokenizedVotingSystem;
    let tokenizedVotingSystem;
    let owner;
    let electionOfficial;
    let voter1;
    let voter2;

    beforeEach(async function () {
        TokenizedVotingSystem = await ethers.getContractFactory("TokenizedVotingSystem");
        [owner, electionOfficial, voter1, voter2] = await ethers.getSigners();

        // Deploy the contract
        tokenizedVotingSystem = await TokenizedVotingSystem.deploy();
        //await tokenizedVotingSystem.initialize(owner.address, ethers.utils.parseEther("10"));
    });

    it("Should initialize the contract correctly", async function () {
        expect(await tokenizedVotingSystem.platformOwner()).to.equal(owner.address);
        expect(await tokenizedVotingSystem.tokenReward()).to.equal(ethers.utils.parseEther("10"));
    });

    it("Should create an election", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 3600); // 1 hour duration

        const election = await tokenizedVotingSystem.getElectionDetails(0);
        expect(election.name).to.equal("Election 2024");
        expect(election.electionOfficial).to.equal(electionOfficial.address);
        expect(election.isActive).to.be.true;
    });

    it("Should add a candidate", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 3600);
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Alice");
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Bob");

        const electionCandidates = await tokenizedVotingSystem.getCandidates(0);
        expect(electionCandidates[0].name).to.equal("Alice");
        expect(electionCandidates[1].name).to.equal("Bob");
    });

    it("Should authorize a voter", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 3600);
        await tokenizedVotingSystem.connect(electionOfficial).authorizeVoter(0, voter1.address);

        const voterDetails = await tokenizedVotingSystem.getVoterDetails(0, voter1.address);
        expect(voterDetails.isAuthorized).to.be.true;
    });

    it("Should cast a vote", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 3600);
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Alice");
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Bob");
        await tokenizedVotingSystem.connect(electionOfficial).authorizeVoter(0, voter1.address);

        await tokenizedVotingSystem.connect(voter1).castVote(0, 0); // Vote for Alice

        const candidate = (await tokenizedVotingSystem.getCandidates(0))[0];
        expect(candidate.voteCount).to.equal(1);

        const voterDetails = await tokenizedVotingSystem.getVoterDetails(0, voter1.address);
        expect(voterDetails.hasVoted).to.be.true;
    });

    it("Should handle voting time constraints", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 1); // 1 second duration
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Alice");
        await tokenizedVotingSystem.connect(electionOfficial).authorizeVoter(0, voter1.address);

        // Wait for election to end
        await new Promise(resolve => setTimeout(resolve, 2000));

        await expect(tokenizedVotingSystem.connect(voter1).castVote(0, 0)).to.be.revertedWith("Election is not active");
    });

    it("Should prevent unauthorized voting", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 3600);
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Alice");

        await expect(tokenizedVotingSystem.connect(voter2).castVote(0, 0)).to.be.revertedWith("You are not authorized to vote");
    });

    it("Should prevent double voting", async function () {
        await tokenizedVotingSystem.connect(electionOfficial).createElection("Election 2024", 3600);
        await tokenizedVotingSystem.connect(electionOfficial).addCandidate(0, "Alice");
        await tokenizedVotingSystem.connect(electionOfficial).authorizeVoter(0, voter1.address);

        await tokenizedVotingSystem.connect(voter1).castVote(0, 0); // First vote
        await expect(tokenizedVotingSystem.connect(voter1).castVote(0, 0)).to.be.revertedWith("You have already voted");
    });
});
