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
    "lastVoteDifference": 0
  },
  "Georgia": {
    "index": 10,
    "voteCount": 0,
    "lastVoteDifference": 0
  },
  "North Carolina": {
    "index": 27,
    "voteCount": 0,
    "lastVoteDifference": 0
  },
  "Nevada": {
    "index": 33,
    "voteCount": 0,
    "lastVoteDifference": 0
  },
  "Pennsylvania": {
    "index": 38,
    "voteCount": 0,
    "lastVoteDifference": 0
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
      votes,
      tot_exp_vote: expectedVotes,
      precincts_reporting: precinctsReporting,
      precincts_total: prectinctsTotal,
      last_updated: lastUpdated
    } = races[states[state].index];

    const newVotes = votes - states[state].voteCount;

    if (newVotes > 0) {
      const votesRemaining = expectedVotes - votes;
      const voteDifference = leaderVotes - trailerVotes;
      const hurdle = ((votesRemaining + voteDifference) / 2) / votesRemaining;
      const trailerPartition = ((newVotes + (states[state].lastVoteDifference - voteDifference)) / 2.) / newVotes;

      console.log(`NEW VOTES IN ${state.toUpperCase()} (${format(new Date(lastUpdated), 'MMM. d, h:mm bbbb')})`);
      console.log(`${newVotes.toLocaleString('en')} new votes | ${leaderName}: ${(1-trailerPartition).toLocaleString("en", { style: "percent", maximumSignificantDigits: 4 } )}, ${trailerName}: ${trailerPartition.toLocaleString("en", {style: "percent", maximumSignificantDigits: 4 })}`);
      console.log(`${leaderName} now leads ${trailerName} by ${voteDifference.toLocaleString('en')} votes.`);
      console.log(`There are estimated to be ${votesRemaining.toLocaleString('en')} votes remaining (${(precinctsReporting / prectinctsTotal).toLocaleString("en", { style: "percent", maximumSignificantDigits: 3 })} precincts reporting).`);
      console.log(`${trailerName} needs ${hurdle.toLocaleString("en", { style: "percent", maximumSignificantDigits: 4 })} of remaining to overtake.\n\n`);

      states[state].voteCount = votes;
      states[state].lastVoteDifference = voteDifference;

      beep(config.get('notification.numBeeps'));
      if (config.get('notification.useHue')) {
        isGoodForDems = (leaderName == config.get('notification.desiredWinnerName') && trailerPartition < .5) || (leaderName != config.get('notification.desiredWinnerName') && trailerPartition > .5)
        hue.alert(isGoodForDems ? config.get('notification.desiredWinnerColor') : config.get('notification.desiredLoserColor'), 4, 10);
      }
    }
  }
});

app.listen(3000);