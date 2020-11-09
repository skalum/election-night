# election-night
Checks NYT election results endpoint every 10 seconds (by default—update config cron schedule to change how often it checks) and notifies you of changes in AZ, GA, NC, NV, PA.

## install
1. clone repo
2. `cd election-night`
2. `npm install`
3. `npm start`

## note
When it first runs, it thinks all votes are "new." Subsequent alerts will only show diffs.

## hue
If you have a local connection to your Hue Bridge, you can add IP address/username to the .env file (copy from .env.example). Group is the id for a group of lights you want to flash.

Also set useHue to `true` in the config file.

## ht
https://github.com/alex/nyt-2020-election-scraper
