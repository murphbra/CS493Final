//Author: Brayden Murphy
//CS 493 Assignment 7
// Adapted from example code provided in course materials for CS 493 

const express = require('express');
const app = express();

const json2html = require('json-to-html');
require('dotenv').config(); 
const {Datastore} = require('@google-cloud/datastore');

const bodyParser = require('body-parser');
const request = require('request');

const datastore = new Datastore();

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const BOAT = "Boat";
const USER = "User"; 
const LOAD = "Load"; 

const router = express.Router();
const login = express.Router();

const CLIENT_ID = process.env.AUTH0_CLIENT_ID; 
const CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET; 
const DOMAIN = process.env.AUTH0_DOMAIN; 

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256']
  });

/* ------------- Begin Lodging Model Functions ------------- */
function post_user(name){
    var key = datastore.key(USER);
	const new_user = {"name": name};
	return datastore.save({"key":key, "data":new_user}).then(() => {
        new_user.id = key.id; 
        return new_user});
}

function get_users() {
    const q = datastore.createQuery(USER);
    return datastore.runQuery(q).then((entities) => {
        // Use Array.map to call the function fromDatastore. This function
        // adds id attribute to every element in the array at element 0 of
        // the variable entities
        return entities[0].map(fromDatastore);
    });
}

function post_boat(name, type, length, public, owner){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length, "owner":owner};
	return datastore.save({"key":key, "data":new_boat}).then(() => {
        new_boat.id = key.id; 
        return new_boat});
}

function get_boats(owner){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore).filter( item => item.owner === owner );
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

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.delete(key); 
}

function post_load(volume, content) {
    var key = datastore.key(LOAD);
    let creation_date = new Date().toLocaleDateString();        //based on code example at source: https://stackabuse.com/how-to-get-the-current-date-in-javascript/
    const new_load = { "volume": volume, "carrier": null, "content": content, "creation_date": creation_date };
    return datastore.save({ "key": key, "data": new_load }).then(() => { 
        new_load.id = key.id; 
        return new_load });
}

function put_load(volume, carrier, content, creation_date) {
    var key = datastore.key(LOAD);
    const new_load = { "volume": volume, "carrier": carrier, "content": content, "creation_date": creation_date };
    return datastore.save({ "key": key, "data": new_load }).then(() => { 
        new_load.id = key.id; 
        return new_load });
}

function get_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            return entity;
        } else {
            return entity.map(fromDatastore);
        }
    });
}

function get_loads_count(){
	const q = datastore.createQuery(LOAD);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		}); 
}

function get_loads(req){
    const results = {};
    //results.total_items_in_collection = 5; 
    var q = datastore.createQuery(LOAD).limit(5);
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);

            for(i=0;i<results.items.length;i++)
            {
                results.items[i].self = "https://portfolioproject-334304.wm.r.appspot.com/loads/" + results.items[i].id;
                if(results.items[i].carrier != null)
                {
                    results.items[i].carrier.self = "https://portfolioproject-334304.wm.r.appspot.com/loads/" + results.items[i].carrier.id; 
                }
            }

            if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
                results.next = "https://portfolioproject-334304.wm.r.appspot.com/loads/" + "?cursor=" + entities[1].endCursor;
            }
            else {
                results.next = "No more results"; 
            }
            return results;
        });
}

function delete_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.delete(key); 
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

function errorJwtPost(){
    return [jwt({
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
        }),
      
        // Validate the audience and the issuer.
        issuer: `https://${DOMAIN}/`,
        algorithms: ['RS256']
      }), 
      function(err, req, res, next){
          res.status(401).end(); 
      }
    ]
}

function errorJwtGet(){
    return [jwt({
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
        }),
      
        // Validate the audience and the issuer.
        issuer: `https://${DOMAIN}/`,
        algorithms: ['RS256']
      }), 
      function(err, req, res, next){
            get_boats_public().then((boats) => {
                res.status(200).send(boats); 
            }); 
        }
    ]
}
/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */
router.get('/', function(req, res) {
    res.send("Success"); 
}); 

router.get('/users', function(req, res) {
    const users = get_users().then((users) => {
        results = {}; 
        for(var i = 0; i<users.length; i++)
        {
            users[i].self = "https://portfolioproject-334304.wm.r.appspot.com/users/" + users[i].id; 
        }
        results.users = users; 
        results.total_items_in_collection = users.length; 
        res.status(200).json(results); 
    })
}); 

router.get('/boats', errorJwtGet(), function(req, res){
        get_boats(req.user.sub)
        .then( (boats) => {
            res.status(200).json(boats); 
        })
});

router.get('/owners/:owner_id/boats', function(req, res){
    get_boats_public_owner(req.params.owner_id).then((boats) =>{
        res.status(200).json(boats); 
    })
}); 


router.post('/boats', errorJwtPost(), function(req, res){
    post_boat(req.body.name, req.body.type, req.body.length, req.body.public, req.user.sub).then((boat) => {
        res.status(201).json(boat).end(); 
    })
});

router.delete('/boats/:boat_id', errorJwtPost(), function(req, res){
    get_boat(req.params.boat_id).then((boat) => {
        if(boat[0] === undefined || boat[0] === null){
            res.status(403).json({"Error": "Invalid boat id"}); 
        }
        else if(req.user.sub != boat[0].owner){
            res.status(403).json({"Error": "Not owner of this boat"}); 
        }
        else {
            delete_boat(req.params.boat_id).then(() => {
                res.status(204); 
            })
        }
    }); 
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
            new_load.self = "https://portfolioproject-334304.wm.r.appspot.com/loads/" + new_load.id; 
            res.status(201).send(new_load); 
        }); 
    }
});


router.get('/loads', function(req, res) {
    const loads = get_loads(req).then((loads) => {
        get_loads_count().then((total) => {
            loads.total_items_in_collection = total.length; 
            res.status(200).json(loads);
        })
    })
}); 

//volume, carrier, content, creation_date

router.put('/loads/:load_id', function (req, res) {
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
        get_load(req.params.load_id).then((load) => {
            var carrier = load[0].carrier; 
            var creation_date = load[0].creation_date; 
            put_load(req.body.volume, carrier, req.body.content, creation_date).then(new_load => { 
                new_load.self = "https://portfolioproject-334304.wm.r.appspot.com/loads/" + new_load.id; 
                res.status(201).send(new_load); 
            }); 
        })
    }
});

router.patch('/loads', function (req, res) {
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
        patch_load(req.body.volume, req.body.content).then(new_load => { 
            new_load.self = "https://portfolioproject-334304.wm.r.appspot.com/loads/" + new_load.id; 
            res.status(201).send(new_load); 
        }); 
    }
});

router.delete('/loads/:load_id', function(req, res) {
    get_load(req.params.load_id)
    .then (load =>
        {
            if (load[0] === undefined || load[0] === null) 
            {
                res.status(404).json({ 'Error': 'No load with this load_Id exists' }).end(); 
            }
            else
            {
                if(load[0].carrier !== null)
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
                }
                delete_load(req.params.load_id).then(res.status(204).end()); 
            }
        })

}); 


login.post('/', function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    var options = { method: 'POST',
            url: `https://${DOMAIN}/oauth/token`,
            headers: { 'content-type': 'application/json' },
            body:
             { grant_type: 'password',
               username: username,
               password: password,
               client_id: CLIENT_ID,
               client_secret: CLIENT_SECRET },
            json: true };
    request(options, (error, response, body) => {
        if (error){
            res.status(500).send(error);
        } else {
            var newUser = true; 
            get_users().then((users) => {
                for(var i=0; i < users.length; i++)
                {
                    if(users[i].name == username)
                    {
                        newUser = false; 
                    }
                }
                return newUser 
            }).then( (newUser) => {
                if(newUser)
                {
                    post_user(username); 
                }
            }).then( () => {
                res.send(body); 
            }); 
            //res.send(body);
        }
    });
});

/* ------------- End Controller Functions ------------- */

app.use('/', router);
app.use('/login', login);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});