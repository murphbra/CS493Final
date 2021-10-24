//Author: Brayden Murphy
//CS 493 Assignment 4
// Adapted from example code provided in course materials for CS 493 

const express = require('express');
const app = express();

const { Datastore } = require('@google-cloud/datastore');
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

/**
 * 
 */

function get_boats() {
    const q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then((entities) => {
        // Use Array.map to call the function fromDatastore. This function
        // adds id attribute to every element in the array at element 0 of
        // the variable entities
        return entities[0].map(fromDatastore);
    });
}

function get_loads() {
    const q = datastore.createQuery(LOADS);
    return datastore.runQuery(q).then((entities) => {
        // Use Array.map to call the function fromDatastore. This function
        // adds id attribute to every element in the array at element 0 of
        // the variable entities
        return entities[0].map(fromDatastore);
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

function patch_boat(id, name, type, length) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    const boat = { "name": name, "type": type, "length": length };
    return datastore.save({ "key": key, "data": boat });
}

function put_boat_in_slip(slip_id, boat_id, number) {
    const key = datastore.key([SLIP, parseInt(slip_id, 10)]);
    const slip = { "number": number, "current_boat": boat_id}; 
    return datastore.save({ "key": key, "data": slip });
    }

function boat_departs_slip(slip_id, number) {
    const key = datastore.key([SLIP, parseInt(slip_id, 10)]);
    const slip = { "number": number, "current_boat": null}; 
    return datastore.save({ "key": key, "data": slip });
    }

function delete_slip(id) {
    const key = datastore.key([SLIP, parseInt(id, 10)]);
    return datastore.delete(key); 
}

function delete_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.delete(key); 
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/boats', function (req, res) {
    const boats = get_boats().then((boats) => {

            for(var i = 0; i< boats.length ; i++)
            {
                boats[i].self = "https://cs493a4-329921.wm.r.appspot.com/boats/" + boats[i].id; 
            }
            res.status(200).json(boats);
        });
});

router.get('/slips', function (req, res) {
    const loads = get_loads().then((loads) => {

            for(var i = 0; i< loads.length ; i++)
            {
                loads[i].self = "https://cs493a4-329921.wm.r.appspot.com/loads/" + loads[i].id; 
            }
            res.status(200).json(loads);
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

router.put('/slips/:slip_id/:boat_id', function (req, res) {
    get_boat(req.params.boat_id)
    .then(boat => 
        {
            if (boat[0] === undefined || boat[0] === null) 
            {
                res.status(404).json({ 'Error': 'The specified boat and/or slip does not exist' }).end(); 
            }

            else
            {
                get_slip(req.params.slip_id)
                .then (slip =>
                    {
                        if (slip[0] === undefined || slip[0] === null) 
                        {
                            res.status(404).json({ 'Error': 'The specified boat and/or slip does not exist' }).end(); 
                        }
            
                        else if (slip[0].current_boat !== null)
                        {
                            res.status(403).json({ 'Error': 'The slip is not empty'}).end(); 
                        }

                        else
                        {
                            var slipNumber = slip[0].number; 
                            put_boat_in_slip(req.params.slip_id, req.params.boat_id, slipNumber); 
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
                load[0].self = "https://cs493a3.wm.r.appspot.com/loads/" + load[0].id; 
                res.status(200).json(load[0]);
            }
        });
});

router.patch('/boats/:id', function (req, res) {
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
    else{
        get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
            } else {
                patch_boat(req.params.id, req.body.name, req.body.type, req.body.length); 
                boat[0].name = req.body.name;
                boat[0].type = req.body.type;
                boat[0].length = req.body.length;
                boat[0].self = "https://cs493a3.wm.r.appspot.com/boats/" + boat[0].id; 
                res.status(200).json(boat[0]);
            }
        });

    }
});

router.delete('/slips/:slip_id/:boat_id', function (req, res) {
    get_boat(req.params.boat_id)
    .then(boat => 
        {
            if (boat[0] === undefined || boat[0] === null) 
            {
                res.status(404).json({ 'Error': 'No boat with this boat_id is at the slip with this slip_id' }).end(); 
            }

            else
            {
                get_slip(req.params.slip_id)
                .then (slip =>
                    {
                        if (slip[0] === undefined || slip[0] === null) 
                        {
                            res.status(404).json({ 'Error': 'No boat with this boat_id is at the slip with this slip_id' }).end(); 
                        }
            
                        else if (slip[0].current_boat != boat[0].id)
                        {
                            res.status(404).json({ 'Error': 'No boat with this boat_id is at the slip with this slip_id'}).end(); 
                        }

                        else
                        {
                            var slipNumber = slip[0].number; 
                            boat_departs_slip(req.params.slip_id, slipNumber); 
                            res.status(204).end(); 
                        }
                    })
                }
        })
}); 

router.delete('/slips/:slip_id', function(req, res) {
    get_slip(req.params.slip_id)
    .then (slip =>
        {
            if (slip[0] === undefined || slip[0] === null) 
            {
                // The 0th element is undefined. This means there is no lodging with this id
                res.status(404).json({ 'Error': 'No slip with this slip_id exists' }).end(); 
            }
            else
            {
                delete_slip(req.params.slip_id).then(res.status(204).end()); 
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
                const slips = get_slips().then((slips) => { 
                    for(var i = 0; i < slips.length; i++)
                    {
                        if(slips[i].current_boat !== null)
                        {
                            if(slips[i].current_boat == req.params.boat_id)
                            {
                                var slipsID = slips[i].id; 
                                var slipsNum = slips[i].number; 
                                boat_departs_slip(slipsID, slipsNum); 
                            }
                        }
                    }
                }); 

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