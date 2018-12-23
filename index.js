const WebSocket = require('ws');
const http = require('http');
const _ = require('lodash');
const moment = require('moment');

var conf = require('./conf.json');
var express = require('express');
var app = express();
var srv = http.Server(app);
var io = require('socket.io')(srv);

app.use(express.static('site'));

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname + '/site/'});
});

var poll = () => {
    conf.hosts.forEach(hostobj => {
        if ('range' in hostobj) {
            if ('start' in hostobj.range && 'end' in hostobj.range) {
                let portarr = [];
                for (let i = hostobj.range.start; i <= hostobj.range.end; i++) {
                    portarr.push(i);
                }
                hostobj.ports = portarr;
            }
        }

        hostobj.ports.forEach(port => {
            const ws = new WebSocket(`ws://${hostobj.host}:${port}/1/1/websocket`);
        
            ws.on('error', (err) => {
                if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
                    if (conf.verbose) console.warn(`Error connecting to ${err.address}:${err.port} - repolling in 1 minute.`);
                } else {
                    io.emit('ws-error', 'f');
                    setTimeout(() => {process.exit(1);}, 100);
                }
            });

            ws.on('message', data => {
                if (data.startsWith('a')) {
                    const parsed = JSON.parse(JSON.parse(data.substring(1))[0]);
                    try {
                        if (parsed.event_name === 'item.output') {
                            var newmsg = parsed.message;
                            newmsg.host = hostobj.host;
                            newmsg.port = port;
                            delete newmsg.session_id;
                            newmsg.data = newmsg.data.replace(/\n/g, ' ').replace(/(\w):(\w)/g,'$1: $2').trim();
                            newmsg.time = new Date();
                            //console.log(newmsg);
                            if (newmsg.data != '') { handle(newmsg); }
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });
    });
};

var items = [];

const sendTable = () => {
    let table = '';
    items.forEach(value => {
        table += makeHTML(value);
    });
    io.emit('ws-table', table);
};

const handle = item => {
    if (_.findIndex(items, {host: item.host, port: item.port, item_id: item.item_id}) > -1) {
        let index = _.findIndex(items, {host: item.host, port: item.port, item_id: item.item_id});
        if (!items[index].finished) {
            items[index].time = item.time;
            items[index].data = item.data;
            if (items[index].data == 'Finished RunScraper for Item') items[index].finished = true;
            items[index].colour = colourRow(item);
        }
    } else {
        item.colour = colourRow(item);
        items.push(item);
        _.remove(items, removeFilter);
        items = _.sortBy(items, ['host', 'port', 'item_id']);
    }
};

const colourRow = (item) => {
    let data = item.data;
    if (data.startsWith('Finished ') || data.startsWith('Waiting 10 seconds') || data.startsWith('Tracker confirmed item')) return 'gray';
    if (data.startsWith('INFO: terroroftinytown.') || data.split(' ')[0].includes('=3')) return 'orange';
    if (data.startsWith('INFO: ') || data.split(' ')[0].includes('=200')) return 'forestgreen';
    if (data.startsWith('Error ') || data.split(' ')[0].includes('=4') || data.split(' ')[0].includes('=5')) return 'red';
    if (data.startsWith('Tracker rate limiting is active')) return 'mediumpurple';
    if (data.includes('%') && data.includes('B/s')) return 'lightseagreen';
    if (data.startsWith('Retrying ') || data.includes('Sleeping.')) return 'silver';
    return 'white';
};

const makeHTML = item => {
    return `<tr class="added-row" id="${createid(item)}" style="color: ${item.colour}"><td><a href="http://${item.host}:${item.port}" target="_blank">${item.host}:${item.port}</a></td><td>${item.item_id.split('-')[1]}</td><td class="time">${moment(item.time).format('HH:mm:ss')}</td><td class="message">${item.data.length > 100 ? item.data.substring(0, 99) + '…' : item.data}</td></tr>`;
};

const createid = item => {
    return `${item.host.replace(/\./g, '_')}-${item.port}-${item.item_id}`;
};

const removeFilter = value => {
    let duration = moment.duration(moment.utc().diff(moment(value.time)));
    if (value.finished || value.data.startsWith('Finished ') || value.data.startsWith('Waiting 10 seconds') || value.data.startsWith('Tracker confirmed item')) {
        return duration.asSeconds() >= 30;
    } else {
        return duration.asSeconds() >= 420; //I could have put 7 minutes, but this is funnier
    }
};

setInterval(poll, 1000*60);
setInterval(sendTable, 150);

srv.listen(conf.port, () => {
    if (conf.verbose) console.log('Listening on localhost:' + conf.port);
    poll();
});