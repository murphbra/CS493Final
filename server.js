//Author: Brayden Murphy
//CS 493 Assignment 4
// Adapted from example code provided in course materials for CS 493 

const express = require('express');
const app = express();

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const datastore = new Datastore();

const BOAT = "Boat"; 

const LOAD = "Load"; 

const router = express.Router();

app.use(bodyParser.json());

function fromDatastore(item) {
    item.id = item[Datastore.KEY].id;
    return item;
}

app.set('trust proxy', true); 
/* ------------- Begin Lodging Model Functions ------------- */

/**
 * 
 */
function post_boat(name, type, length) {
    var key = datastore.key(BOAT);
    var loads = []; 
    const new_boat = { "name": name, "type": type, "length": length, "loads": loads };
    return datastore.save({ "key": key, "data": new_boat }).then(() => { 
        new_boat.id = key.id; 
        return new_boat });
}

function post_load(volume, content) {
    var key = datastore.key(LOAD);
    let creation_date = new Date().toLocaleDateString();        //based on code example at source: https://stackabuse.com/how-to-get-the-current-date-in-javascript/
    const new_load = { "volume": volume, "carrier": null, "content": content, "creation_date": creation_date };
    return datastore.save({ "key": key, "data": new_load }).then(() => { 
        new_load.id = key.id; 
        return new_load });
}

/*
function get_boats(req) {
    const q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then((entities) => {
        return entities[0].map(fromDatastore);
    });
}
*/
function get_boats(req){
    var q = datastore.createQuery(BOAT).limit(3);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        //prev = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + req.query.cursor;
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);

            for(i=0;i<results.items.length;i++)
            {
                results.items[i].self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + results.items[i].id;
                for(x=0;x<results.items[i].loads.length;x++)
                {
                    results.items[i].loads[x].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + results.items[i].loads[x].id; 
                }
            }

            if(entities[1].moreResults != Datastore.NO_MORE_RESULTS ){
                results.next = "https://cs493a4-329921.wm.r.appspot.com/boats/" + "?cursor=" + entities[1].endCursor;
            }
            else {
                results.next = "No more results"; 
            }
			return results;
		});
}

function get_loads(req){
    var q = datastore.createQuery(LOAD).limit(3);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        //prev = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + req.query.cursor;
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);

            for(i=0;i<results.items.length;i++)
            {
                results.items[i].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + results.items[i].id;
                if(results.items[i].carrier != null)
                {
                    results.items[i].carrier.self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + results.items[i].carrier.id; 
                }
            }

            if(entities[1].moreResults != Datastore.NO_MORE_RESULTS ){
                results.next = "https://cs493a4-329921.wm.r.appspot.com/loads/" + "?cursor=" + entities[1].endCursor;
            }
            else {
                results.next = "No more results"; 
            }
			return results;
		});
}

function get_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(fromDatastore);
        }
    });
}

function get_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(fromDatastore);
        }
    });
}

function assign_load_to_boat(boat_id, name, type, length, load_array) {
    const key = datastore.key([BOAT, parseInt(boat_id, 10)]);
    const boat = {"name": name, "type": type, "length": length, "loads": load_array}; 
    return datastore.save({ "key": key, "data": boat });
    }

function assign_boat_to_load(load_id, volume, carrier, content, creation_date) {
    const key = datastore.key([LOAD, parseInt(load_id, 10)]);
    const load = { "volume": volume, "carrier": carrier, "content": content, "creation_date": creation_date}; 
    return datastore.save({ "key": key, "data": load });
    }

function delete_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.delete(key); 
}
function delete_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.delete(key); 
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/boats', function (req, res) {
    const boats = get_boats(req).then((boats) => {
            /*
            for(var i = 0; i< boats.length ; i++)
            {
                boats[i].self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + boats[i].id; 
            }
            */
            res.status(200).json(boats);
        });
});

router.get('/loads', function (req, res) {
    const loads = get_loads(req).then((loads) => {
            /*
            for(var i = 0; i< loads.length ; i++)
            {
                loads[i].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + loads[i].id; 
            }
            */ 
            res.status(200).json(loads);
        });
});

router.get('/boats/:boat_id/loads', function(req, res) {
    get_boat(req.params.boat_id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
            } else {
                //const return_array = new Object(); 
                //return_array.boat_loads = []; 
                const loads_array = boat[0].loads; 
                for(i=0;i<loads_array.length;i++)
                {
                    loads_array[i].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + loads_array[i].id;
                }
                res.status(200).json(loads_array);
            }
        });
});

router.post('/boats', function (req, res) {
    if(req.body.length === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' }).end(); 
    } 
    if(req.body.name === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' }).end(); 
    }
    if(req.body.type === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' }).end(); 
    }
    else 
    {
        post_boat(req.body.name, req.body.type, req.body.length).then(new_boat => { 
            new_boat.self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + new_boat.id; 
            res.status(201).send(new_boat); 
        }); 
    }
});

router.post('/loads', function (req, res) {
    if(req.body.volume === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' }).end(); 
    } 
    if(req.body.content === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' }).end(); 
    } 
    else 
    {
        post_load(req.body.volume, req.body.content).then(new_load => { 
            new_load.self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + new_load.id; 
            res.status(201).send(new_load); 
        }); 
    }
});

router.put('/boats/:boat_id/loads/:load_id', function (req, res) {
    get_boat(req.params.boat_id)
    .then(boat => 
        {
            if (boat[0] === undefined || boat[0] === null) 
            {
                res.status(404).json({ 'Error': 'The specified boat and/or load does not exist' }).end(); 
            }

            else
            {
                get_load(req.params.load_id)
                .then (load =>
                    {
                        if (load[0] === undefined || load[0] === null) 
                        {
                            res.status(404).json({ 'Error': 'The specified boat and/or load does not exist' }).end(); 
                        }
            
                        else if (load[0].carrier !== null)
                        {
                            res.status(403).json({ 'Error': 'This load is already assigned to another boat'}).end(); 
                        }

                        else
                        {
                            //var slipNumber = slip[0].number; 
                            //put_boat_in_slip(req.params.slip_id, req.params.boat_id, slipNumber); 
                            var name = boat[0].name;
                            var type = boat[0].type;
                            var length = boat[0].length; 
                            const load_array = boat[0].loads; 
                            //var load_self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + req.params.load_id;
                            load_array.push({"id": req.params.load_id});
                            assign_load_to_boat(req.params.boat_id, name, type, length, load_array); 

                            var volume = load[0].volume;
                            var content = load[0].content; 
                            var creation_date = load[0].creation_date;
                            //var boat_self =  "https://cs493a4-329921.wm.r.appspot.com/boats/" + req.params.boat_id; 
                            const carrier = {"id": req.params.boat_id, "name": name}; 
                            assign_boat_to_load(req.params.load_id, volume, carrier, content, creation_date); 
                            res.status(204).end(); 
                        }
                    })
                }
        })
}); 


router.get('/boats/:id', function (req, res) {
    get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
            } else {
                boat[0].self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + boat[0].id; 
                //const loads_array = boat[0].loads;
                for(i=0;i<boat[0].loads.length;i++)
                {
                    boat[0].loads[i].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + boat[0].loads[i].id ;
                }
                res.status(200).json(boat[0]);
            }
        });
});

router.get('/loads/:id', function (req, res) {
    get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                load[0].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + load[0].id; 
                if(load[0].carrier != null)
                {
                    load[0].carrier.self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + load[0].carrier.id; 
                }
                res.status(200).json(load[0]);
            }
        });
});


router.delete('/boats/:boat_id/loads/:load_id', function (req, res) {
    get_boat(req.params.boat_id)
    .then(boat => 
        {
            if (boat[0] === undefined || boat[0] === null) 
            {
                res.status(404).json({ 'Error': 'No boat with this boat_id has a load with this load_id' }).end(); 
            }

            else
            {
                get_load(req.params.load_id)
                .then (load =>
                    {
                        if (load[0] === undefined || load[0] === null) 
                        {
                            res.status(404).json({ 'Error': 'No boat with this boat_id has a load with this load_id' }).end(); 
                        }

                        else if (load[0].carrier === null)
                        {
                            res.status(404).json({ 'Error': 'No boat with this boat_id has a load with this load_id'}).end(); 
                        }

                        else if (load[0].carrier.id != boat[0].id)
                        {
                            res.status(404).json({ 'Error': 'No boat with this boat_id has a load with this load_id'}).end(); 
                        }

                        else
                        {
                            
                            var name = boat[0].name;
                            var type = boat[0].type;
                            var length = boat[0].length; 
                            const load_array = boat[0].loads; 
                            for(i=0; i<load_array.length; i++)
                            {
                                if(load_array[i].id == req.params.load_id)
                                {
                                    load_array.splice(i, 1); 
                                }
                            }
                            assign_load_to_boat(req.params.boat_id, name, type, length, load_array); 

                            var volume = load[0].volume;
                            var content = load[0].content; 
                            var creation_date = load[0].creation_date;
                            var carrier = null; 
                            assign_boat_to_load(req.params.load_id, volume, carrier, content, creation_date); 

                            res.status(204).end(); 
                        }
                    })
                }
        })
}); 

router.delete('/loads/:load_id', function(req, res) {
    get_load(req.params.load_id)
    .then (load =>
        {
            if (load[0] === undefined || load[0] === null) 
            {
                // The 0th element is undefined. This means there is no lodging with this id
                res.status(404).json({ 'Error': 'No load with this load_Id exists' }).end(); 
            }
            else
            {
                get_boat(load[0].carrier.id)
                .then (boat => {
                    var name = boat[0].name;
                    var type = boat[0].type;
                    var length = boat[0].length; 
                    const load_array = boat[0].loads; 
                    for(i=0; i<load_array.length; i++)
                        {
                            if(load_array[i].id == req.params.load_id)
                            {
                                load_array.splice(i, 1); 
                            }
                        }
                        assign_load_to_boat(boat[0].id, name, type, length, load_array); 
                })
                delete_load(req.params.load_id).then(res.status(204).end()); 
            }
        })

}); 

router.delete('/boats/:boat_id', function(req, res) {
    get_boat(req.params.boat_id)
    .then (boat =>
        {
            if (boat[0] === undefined || boat[0] === null) 
            {
                // The 0th element is undefined. This means there is no lodging with this id
                res.status(404).json({ 'Error': 'No boat with this boat_id exists' }).end(); 
            }
            else
            {
                const load_array = boat[0].loads; 
                for(i=0; i<load_array.length; i++)
                {
                    get_load(load_array[i].id)
                    .then (load => {
                        var volume = load[0].volume;
                        var content = load[0].content; 
                        var creation_date = load[0].creation_date;
                        var carrier = null; 
                        var id = load[0].id; 
                        assign_boat_to_load(id, volume, carrier, content, creation_date); 
                    }); 
                }
                delete_boat(req.params.boat_id).then(res.status(204).end()); 
            }
        })
}); 

/* ------------- End Controller Functions ------------- */

app.use('/', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});