#List Warrior Jobs
Provides a configurable terminal-like web interface for keeping track of progress over all of your ArchiveTeam Warrior jobs.

##Installation
```
npm install --production
```
Or, if you're developing and want ESLint installed as well,
```
npm install
```

##Configuration
All configuration is done in a `conf.json` file that is in the same directory as `index.html`. See `conf.json.example` for an example.

`hosts` is an array of objects, specifying what hosts the webserver should listen to. Each object has a `host` element specifying the host (IP address or DNS name), and either an array of `ports` or a `range` object with a `start` and `end` property. If both `ports` and `range` are filled, `range` takes precedence. The webserver interpolates the ports from the start and the end of a range. Any invalid hosts are skipped automatically, so you can set a larger range if you're not sure what port range you have (in case of Docker Swarm automatic restarts, for example).

`verbose` is an optional parameter, defaulting to false. When set to true, it logs more messages in the server logs, such as a webserver "ready" message and when skipping unreachable hosts and/or ports.

`port` is a required parameter, signifying the port the server should listen on.

##Specific project support
At the moment, highlighting is enabled for the following ArchiveTeam projects:
* Tumblr
* URLTeam 2

If other projects happen to use the same log output format as the ones above, highlighting is automatically enabled; otherwise, a change to the code is needed.