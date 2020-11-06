require('dotenv').config()

const axios = require('axios').default;
const cron = require('node-cron');
const express = require('express');
const beep = require('beepbeep');
const config = require('config');
const Hue = require('./lib/Hue.js')
const format = require('date-fns/format');

const hue = new Hue(process.env.HUE_IP, process.env.HUE_USERNAME);

const app = express();

const states = {
  "Arizona": {
    "index": 3,
    "voteCount": 0,
    "lastVoteDifference": 0,
    "leaderName": ""
  },
  "Georgia": {
    "index": 10,
    "voteCount": 0,
    "lastVoteDifference": 0,
    "leaderName": ""
  },
  "North Carolina": {
    "index": 27,
    "voteCount": 0,
    "lastVoteDifference": 0,
    "leaderName": ""
  },
  "Nevada": {
    "index": 33,
    "voteCount": 0,
    "lastVoteDifference": 0,
    "leaderName": ""
  },
  "Pennsylvania": {
    "index": 38,
    "voteCount": 0,
    "lastVoteDifference": 0,
    "leaderName": ""
  }
}

cron.schedule(config.get('run.cronSchedule'), async function() {
  const {
    data: {
      data: {
        races
      }
    }
  } = await axios.get('https://static01.nyt.com/elections-assets/2020/data/api/2020-11-03/votes-remaining-page/national/president.json');

  for (const state in states) {
    const {
      candidates: [
        { last_name: leaderName, votes: leaderVotes },
        { last_name: trailerName, votes: trailerVotes }
      ],
      counties,
      votes,
      precincts_reporting: precinctsReporting,
      precincts_total: prectinctsTotal,
      last_updated: lastUpdated
    } = races[states[state].index];

    const expectedVotes = counties.reduce((votes, county) => votes + county.tot_exp_vote, 0);
    const newVotes = votes - states[state].voteCount;
    const voteDifference = leaderVotes - trailerVotes;
    const votesRemaining = expectedVotes - votes;
    const hurdle = votesRemaining > 0 ? (voteDifference + (votesRemaining * (leaderVotes + trailerVotes)) / votes) / (2 * votesRemaining) : 0;

    if (newVotes != 0) {
      const bumped = leaderName != states[state].leaderName;
      const lastVoteDifference = states[state].lastVoteDifference * (bumped ? -1 : 1); 
      const trailerPartition = ((newVotes + (lastVoteDifference - voteDifference)) / 2.) / newVotes;

      console.log(`NEW VOTES IN ${state.toUpperCase()} (${format(new Date(lastUpdated), 'MMM. d, h:mm bbbb')})`);
      console.log(`${newVotes.toLocaleString('en')} new votes | ${leaderName}: ${(1-trailerPartition).toLocaleString("en", { style: "percent", maximumSignificantDigits: 4 } )}, ${trailerName}: ${trailerPartition.toLocaleString("en", {style: "percent", maximumSignificantDigits: 4 })}`);
      console.log(`${leaderName} now leads ${trailerName} by ${voteDifference.toLocaleString('en')} votes.`);
      console.log(`There are estimated to be ${votesRemaining.toLocaleString('en')} votes remaining (${(precinctsReporting / prectinctsTotal).toLocaleString("en", { style: "percent", maximumSignificantDigits: 3 })} precincts reporting).`);
      console.log(`${trailerName} needs ${hurdle.toLocaleString("en", { style: "percent", maximumSignificantDigits: 4 })} of remaining to overtake.\n\n`);

      states[state].voteCount = votes;
      states[state].lastVoteDifference = voteDifference;
      states[state].leaderName = leaderName;

      beep(config.get('notification.numBeeps'));
      if (config.get('notification.useHue')) {
        isGoodForDems = (leaderName == config.get('notification.desiredWinnerName') && trailerPartition < .5) || (leaderName != config.get('notification.desiredWinnerName') && trailerPartition > .5)
        hue.alert(isGoodForDems ? config.get('notification.desiredWinnerColor') : config.get('notification.desiredLoserColor'), 4, 10);
      }
    }
  }
});

app.listen(3000);