// express setup
const express = require('express')
const app = express()
const port = 3000
// parse request body
app.use(express.urlencoded())

app.use(express.static('public'));

// handlebars setup
var exphbs  = require('express-handlebars');
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// MySQL Setup
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'meetup'
});

connection.connect();
util = require('util')
connection.query = util.promisify(connection.query);

// moment
const moment = require('moment')

app.get('/', function (req, res) {
  res.render('home');
})


app.get('/login', function (req, res) {
  res.render('login');
})

app.post('/login', function (req, res) {
  connection.query(`SELECT * FROM users WHERE name="${req.body.name}" AND password="${req.body.password}"`, function (error, results, fields) {
    if(results.length === 0)
      res.redirect('login')
    else
      res.redirect(`/events?userId=${results[0].id}`)
  });
})

app.get('/events', async function (req, res) {
  usersFromSQL = await connection.query(`SELECT * FROM users WHERE id="${req.param('userId')}"`)
  if(usersFromSQL.length === 0) res.redirect('login') 

  const searchTerm = req.param('search') ? req.param('search') : '';
  let eventsFromSQL = await connection.query(`SELECT users.name AS hostName, events.* FROM events INNER JOIN users ON events.userId = users.id WHERE title LIKE "%${searchTerm}%";`)
  eventsFromSQL = eventsFromSQL.map((event) => {
    event.day = moment(event.dateofEvent).format(" DD")
    event.month = moment(event.dateofEvent).format(" MMM ")
    return event;
  });
  
  const context = { userForHTML: usersFromSQL[0], eventsForHTML: eventsFromSQL};
  res.render('events', context);
})


app.get('/signup', function (req, res) {
  res.render('signup');
})

app.post('/signup', async function (req, res) {
  sign = await connection.query(`INSERT INTO users (name, password, phone, profession, email, city) VALUES("${req.body.name}",  "${req.body.password}", "${req.body.phone}","${req.body.profession}", "${req.body.email}","${req.body.city}")`)
  {  
    res.redirect(`/events?userId=${sign.insertId}`)
  }
})

app.get('/host', async function(req,res) {
  usersFromSQL = await connection.query(`SELECT * FROM users WHERE id="${req.param('userId')}"`)
  if(usersFromSQL.length === 0) res.redirect('login')
  currentUser = usersFromSQL[0]
  res.render('host',{ userForHTML: currentUser })
})

app.post('/host', async function (req, res) {
  console.log("MOMENT DATE: ", moment(req.body.date).format("YYYY-MM-DD"));
  host = await connection.query(`INSERT INTO events(
      userId, title, subtitle, description, location, dateOfEvent, time
    ) VALUES(
      "${req.body.userId}", "${req.body.title}", "${req.body.subtitle}", "${req.body.description}", "${req.body.location}", "${moment(req.body.date).format("YYYY-MM-DD")}", "${req.body.time}"
  )`)
      res.redirect(`/details?userId=${req.body.userId}&eventId=${host.insertId}`)
})

app.get('/details', async function (req, res) {
  usersFromSQL = await connection.query(`SELECT * FROM users WHERE id="${req.param('userId')}"`)
  if(usersFromSQL.length === 0) res.redirect('login')
  currentUser = usersFromSQL[0]

  let eventFromSQL = (await connection.query(`SELECT users.name AS hostName, events.* FROM events INNER JOIN users ON events.userId = users.id WHERE events.id=${req.param('eventId')};`))[0]
  eventFromSQL.day = moment(eventFromSQL.dateofEvent).format(" DD")
  eventFromSQL.month = moment(eventFromSQL.dateofEvent).format(" MMM ")
  eventFromSQL.date = moment(eventFromSQL.dateofEvent).format("dddd, MMM Do YYYY")

  let members=(await connection.query(`SELECT id, name from users inner join attendees WHERE users.id = attendees.userId AND attendees.eventId =${req.param('eventId')}`))

  comments = await connection.query(`SELECT comments.*, users.name AS userName FROM comments INNER JOIN users ON comments.userId = users.id WHERE eventId=${req.param('eventId')}`);
  const context = { comments: comments, userForHTML: currentUser, eventForHTML: eventFromSQL, members: members};
  res.render('details', context);

})

app.post('/details',async function (req, res) {
  alreadyAttending = await connection.query(`SELECT * FROM attendees WHERE eventId=${req.body.eventId} AND userId=${req.body.userId}`);
  if(alreadyAttending.length === 0) {
    attend= await connection.query(`INSERT INTO attendees (eventId ,userId) VALUES("${req.body.eventId}", "${req.body.userId}")`)  
  }
  res.redirect(`/details?eventId=${req.body.eventId}&userId=${req.body.userId}`)
});

app.post('/comments',async function (req, res) {
  attend= await connection.query(`INSERT INTO comments VALUES("${req.body.eventId}", "${req.body.userId}", "${req.body.text}")`)  
  res.redirect(`/details?eventId=${req.body.eventId}&userId=${req.body.userId}`)
});


app.get('/profile', async function(req,res) {
  usersFromSQL = await connection.query(`SELECT * FROM users WHERE id="${req.param('userId')}"`)
  if(usersFromSQL.length === 0) res.redirect('login')
  currentUser = usersFromSQL[0]
  history = await connection.query(`SELECT * FROM events where userId="${req.param('userId')}"`)
  console.log('history:',history)
  attend = await connection.query(`SELECT events.title,events.subtitle, attendees.* FROM events INNER JOIN attendees ON events.id = attendees.eventId WHERE attendees.userId =${req.param('userId')}`)
  console.log('history:',attend)
  res.render('profile',{userForHTML:currentUser,history: history,attend:attend })
});

app.listen(port)

console.log("App started!")
