var https = require('https');
var http = require('http');
var express=require('express');
var fs = require('fs');
var url= require('url');

var app = express();

app.configure(function () {
    app.use(express.bodyParser());
	app.use(express.cookieParser('Test'));
	app.use(express.session());
    app.use(app.router);
});

app.get('/', function (req, res) {
      console.log("Send login page");
	  //Store targetId and RESTURI in a session
	  req.session.targetId = req.query.targetId;
      req.session.RESTURI = req.query.proxyRestUri;
      res.sendfile('SelectUser.htm');
 });

app.get('/logout', function (req, res) {
    console.log("Logout user "+selectedUser+" directory "+userDirectory);
	var selectedUser = req.query.selectedUser;
    var userDirectory = req.query.userDirectory;
	logout(req,res,selectedUser,userDirectory);
});

app.get('/login', function (req, res) {
    var selectedUser = req.query.selectedUser;
    var userDirectory = req.query.userDirectory;
	var targetId=req.session.targetId;
	var RESTURI=req.session.RESTURI;
    console.log("Login user "+selectedUser+" directory "+userDirectory+"targetId"+targetId);
	//Request a ticket for the user and user directory
    requestticket(req, res, selectedUser, userDirectory, RESTURI, targetId);
	req.session.destroy();
});

app.get("/resource/font", function (req, res) {
    res.sendfile('qlikview-sans.svg');
});

app.get("/resource/icon", function (req, res) {
    res.sendfile("users.png");
});

app.get("/resource/qv", function (req, res) {
    res.sendfile("QlikLogo-RGB.png");
});

app.get("/resource/background", function (req, res) {
    res.sendfile("ConnectingCircles-01.png");
});


function logout(req, res, selectedUser, userDirectory) {
    //Configure parameters for the logout request
    var options = {
        host: url.parse(RESTURI).hostname,
        port: url.parse(RESTURI).port,
        path: url.parse(RESTURI).path+'/user/'+userDirectory.toString()+'/' + selectedUser.toString() + '?xrfkey=aaaaaaaaaaaaaaaa',
        method: 'DELETE',
		pfx: fs.readFileSync('Client.pfx'),
		passphrase: 'test',
        headers: { 'x-qlik-xrfkey': 'aaaaaaaaaaaaaaaa', 'Content-Type': 'application/json' },
		rejectUnauthorized: false,
        agent: false
    };

    console.log("Path:", options.path.toString());
    //Send request to get logged out
    var ticketreq = https.request(options, function (ticketres) {
        console.log("statusCode: ", ticketres.statusCode);
        //console.log("headers: ", ticketres.headers);

        ticketres.on('data', function (d) {
			console.log(selectedUser, " is logged out");
            console.log("DELETE Response:", d.toString());
			res.send("<HTML><HEAD></HEAD><BODY>"+selectedUser + " is logged out<BR><PRE>"+ d.toString()+"</PRE></BODY><HTML>");
        });
        
    });

    //Send request to logout
    ticketreq.end();

    ticketreq.on('error', function (e) {
        console.error('Error' + e);
    });
};


function requestticket(req, res, selecteduser, userdirectory, RESTURI, targetId) {
    
    //Configure parameters for the ticket request
    var options = {
        host: url.parse(RESTURI).hostname,
        port: url.parse(RESTURI).port,
        path: url.parse(RESTURI).path + '/ticket?xrfkey=aaaaaaaaaaaaaaaa',
        method: 'POST',
        headers: { 'X-qlik-xrfkey': 'aaaaaaaaaaaaaaaa', 'Content-Type': 'application/json' },
		pfx: fs.readFileSync('client.pfx'),
		passphrase: 'test',
		rejectUnauthorized: false,
        agent: false
    };

	//console.log(targetId);
    //Send ticket request
    var ticketreq = https.request(options, function (ticketres) {
        console.log("statusCode: ", ticketres.statusCode);
        //console.log("headers: ", ticketres.headers);

        ticketres.on('data', function (d) {
            //Parse ticket response
			//console.log(d.toString());	
            var ticket = JSON.parse(d.toString());

            //Build redirect including ticket
			 if (ticket.TargetUri.indexOf("?") > 0) {
                redirectURI = ticket.TargetUri + '&QlikTicket=' + ticket.Ticket;
            } else {
                redirectURI = ticket.TargetUri + '?QlikTicket=' + ticket.Ticket;
            }
            
            
            console.log("Login redirect:", redirectURI);
            res.redirect(redirectURI);
        });
    });

    //Send JSON request for ticket
    var jsonrequest = JSON.stringify({ 'UserDirectory': userdirectory.toString() , 'UserId': selecteduser.toString(), 'Attributes': [], 'TargetId': targetId.toString() });
	//console.log(jsonrequest);
    ticketreq.write(jsonrequest);
    ticketreq.end();

    ticketreq.on('error', function (e) {
        console.error('Error' + e);
    });
};

//Server options to run an HTTPS server
var httpsoptions = {
    pfx: fs.readFileSync('server.pfx'),
    passphrase: 'test'
};

//Start listener
https.createServer(httpsoptions, app).listen(8185);