const axios = require('axios').default;
const cron = require('node-cron');
const express = require('express');
const beep = require('beepbeep');

const app = express();

const states = {
  "Arizona": {
    "index": 3,
    "voteCount": 0,
    "lastVoteDifference": 0,
  },
  "Georgia": {
    "index": 10,
    "voteCount": 0,
    "lastVoteDifference": 0,
  },
  "North Carolina": {
    "index": 27,
    "voteCount": 0,
    "lastVoteDifference": 0,
  },
  "Nevada": {
    "index": 33,
    "voteCount": 0,
    "lastVoteDifference": 0,
  },
  "Pennsylvania": {
    "index": 38,
    "voteCount": 0,
    "lastVoteDifference": 0,
  },
}

cron.schedule('*/10 * * * * *', async function() {
  const {
    data: {
      data: results,
    },
  } = await axios.get('https://static01.nyt.com/elections-assets/2020/data/api/2020-11-03/votes-remaining-page/national/president.json');

  let newInformation = false;

  for (const state in states) {
    const {
      candidates: [
        { last_name: leaderName, votes: leaderVotes },
        { last_name: trailerName, votes: trailerVotes },
      ],
      votes,
      tot_exp_vote: expectedVotes,
      precincts_reporting: precinctsReporting,
      precincts_total: prectinctsTotal,
    } = results.races[states[state].index];

    const newVotes = votes - states[state].voteCount;

    if (newVotes > 1) {
      newInformation = true;

      const votesRemaining = expectedVotes - votes;
      const voteDifference = leaderVotes - trailerVotes;
      const hurdle = ((votesRemaining + voteDifference) / 2) / votesRemaining;
      const trailerPartition = ((newVotes + (states[state].lastVoteDifference - voteDifference)) / 2.) / newVotes;

      console.log(`NEW VOTES IN ${state.toUpperCase()}`);
      console.log(`${votes.toLocaleString('en')} new votes | ${leaderName}: ${(1-trailerPartition).toLocaleString("en", { style: "percent", maximumSignificantDigits: 4 } )}, ${trailerName}: ${trailerPartition.toLocaleString("en", {style: "percent", maximumSignificantDigits: 4 })}`);
      console.log(`${leaderName} now leads ${trailerName} by ${voteDifference.toLocaleString('en')} votes.`);
      console.log(`There are estimated to be ${votesRemaining.toLocaleString('en')} votes remaining (${(precinctsReporting / prectinctsTotal).toLocaleString("en", { style: "percent", maximumSignificantDigits: 3 })} precincts reporting).`);
      console.log(`${trailerName} needs ${hurdle.toLocaleString("en", { style: "percent", maximumSignificantDigits: 4 })} of remaining to overtake.\n\n`);

      states[state].voteCount = votes;
      states[state].lastVoteDifference = voteDifference;
    }
  }

  if (newInformation) beep(2);
});

app.listen(3000);