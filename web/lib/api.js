import uuid from 'node-uuid';
import * as clientConfig from './client-config';

export default function(app) {

    function waitForValveEvent(timeout,callback) {
        let listener = null;
        let timeoutHandle = setTimeout(() => {
           app.valveController.removeListener('setOpen',listener); 
           callback(true,null);
        },timeout);
        listener = ({open}) => {
            app.valveController.removeListener('setOpen',listener);
            clearTimeout(timeoutHandle);
            callback(false,open);
        };
        app.valveController.addListener('setOpen',listener);
    }
    
    app.get('/api/1/poll-valve',(req,res) => {
        const query = (req.query.open==='true');
        if (query !== app.valveController.getOpen()) {
            return res.json({
                success: true,
                change: true,
                open: app.valveController.getOpen()
            });
        } else {
            res.writeHead(200,{'Content-Type':'application/json'});
            res.write(''); // flush headers to the client
            waitForValveEvent(clientConfig.LONGPOLL_TIMEOUT,(timedOut,open) => {
                res.write(JSON.stringify({
                    success: true,
                    change: timedOut ? false: open !== query,
                    open
                }));
                res.end();
            });
        }
    });

    app.post('/api/1/toggle-valve',(req,res) => {
        app.valveController.toggleOpen('web user',(err,open) => {
            if (err) {
                return res.status(500).json({
                    success: false
                });
            }
            res.json({
                success: true,
                open
            });
        });
    });

    app.get('/api/1/history',(req,res) => {
        app.storage.getItem('history', (err,value) => {
            if (err) {
               app.logger.error(`Unable to get history items ${err.stack}`); 
               res.status(500).json({ success: false });
            }
            else if (!value) {
                res.json({
                    items: [],
                    latest: null,
                    success: true
                });
            } else {
                let items = value.items;
                if (req.query.after) {
                    items = items.filter(i => i.id > req.query.after);
                }
                res.json({
                    items,
                    latest: items.length > 0 ? items[0].id : null,
                    success: true
                });
            }
        });
    });

    app.get('/api/1/schedule',(req,res) => {
        app.storage.getItem('schedule', (err,value) => {
            if (err) {
               app.logger.error(`Unable to get schedule items ${err.stack}`); 
               res.status(500).json({ success: false });
            }
            else if (!value) {
                res.json({
                    items: [],
                    success: true
                });
            } else {
                res.json({
                    items: value.items,
                    success: true
                });
            }
        });
    });

    app.delete('/api/1/schedule/:id',(req,res) => {
        app.storage.getItem('schedule', (err,value) => {
            if (err) {
               app.logger.error(`Unable to get schedule items ${err.stack}`); 
               return res.status(500).json({ success: false });
            }
            if (!value) {
                value = {
                    items: []
                };
            }

            value.items = value.items.filter(item => {
                return item.id !== req.params.id
            });
            app.storage.setItem('schedule',value,err => {
                if (err) {
                   app.logger.error(`Unable to set schedule items ${err.stack}`); 
                   return res.status(500).json({ success: false });
                }
                app.scheduler.reload();
                res.json({
                    success: true
                });
            });
        });
    });

    app.post('/api/1/schedule',(req,res) => {
        if (!req.body) {
            return res.status(400).json({ 
                success: false,
                message: 'expected JSON body in request'
            });
        }

        if (typeof(req.body.duration) !== 'number' || req.body.duration < 1 || req.body.duration > 60) {
            return res.status(400).json({ 
                success: false,
                message: 'Required field "duration" not present or is not a Number between 1 and 60'
            });
        }

        if (typeof(req.body.time) !== 'number' || req.body.time < 0 || req.body.time > 23) {
            return res.status(400).json({ 
                success: false,
                message: 'Required field "time" not present or is not a Number between 0 and 23'
            });
        }

        if (typeof(req.body.frequency) !== 'number' || req.body.frequency < 1 || req.body.frequency > 7) {
            return res.status(400).json({ 
                success: false,
                message: 'Required field "frequency" not present or is not a Number between 1 and 7'
            });
        }

        let newItem = {
            id: uuid.v4(),
            duration: req.body.duration,
            time: req.body.time,
            frequency: req.body.frequency
        };

        app.storage.getItem('schedule', (err,value) => {
            if (err) {
               app.logger.error(`Unable to get schedule items ${err.stack}`); 
               return res.status(500).json({ success: false });
            }
            if (!value) {
                value = {
                    items: [],
                    waterUntil: 0
                };
            }
            value.items.push(newItem);
            app.storage.setItem('schedule',value,err => {
                if (err) {
                   app.logger.error(`Unable to set schedule items ${err.stack}`); 
                   return res.status(500).json({ success: false });
                }
                app.scheduler.reload();
                res.json({
                    success: true,
                    newItem
                });
            });
        });
    });
}