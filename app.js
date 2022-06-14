const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateUser = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader != undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//Register API
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;

  const getUserQuery = `SELECT * FROM user WHERE username ='${username}'`;
  const dbUser = await db.get(getUserQuery);
  const hashedPassword = await bcrypt.hash(password, 12);

  if (dbUser === undefined) {
    const addUserQuery = `INSERT INTO user(username,password,name,gender) 
        VALUES('${username}','${hashedPassword}','${name}','${gender}') `;
    db.run(addUserQuery);
    response.send("User created successfully");
  } else if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login user API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//get tweets API
app.get("/user/tweets/feed/", authenticateUser, async (request, response) => {
  const getUserTweetQuery = `
    SELECT username,tweet,date_time AS dateTime 
    FROM tweet ,user
    WHERE user.user_id = tweet.user_id
    GROUP BY dateTime;`;

  const tweetList = await db.all(getUserTweetQuery);
  response.send(tweetList);
});

//user following API
app.get("/user/following/", authenticateUser, async (request, response) => {
  const getFollowingQuery = `
    SELECT name FROM user,follower
    WHERE user.user_id = follower.following_user_id`;
  const namesList = await db.all(getFollowingQuery);
  response.send(namesList);
});

// //user follower API
app.get("/user/followers/", authenticateUser, async (request, response) => {
  const getFollowingQuery = `
    SELECT name FROM user,follower
    WHERE user.user_id = follower.follower_user_id`;
  const namesList = await db.all(getFollowingQuery);
  response.send(namesList);
});
// //user following API
// app.get("/user/following/",authenticateUser,async(request,response)=>{

// });
// //user following API
// app.get("/user/following/",authenticateUser,async(request,response)=>{

// });
// //user following API
// app.get("/user/following/",authenticateUser,async(request,response)=>{

// });
// //user following API
// app.get("/user/following/",authenticateUser,async(request,response)=>{

// });
// //user following API
// app.get("/user/following/",authenticateUser,async(request,response)=>{

// });

//9.user tweetsAPI
app.get("/user/tweets/", authenticateUser, async (request, response) => {
  const getUserTweetsQuery = `
    SELECT tweet,
    COUNT(like_id) AS likes,
    COUNT(reply_id) AS replies,
    date_time AS dateTime
    FROM user u ,reply r, tweet t,like l
    WHERE 
    u.user_id = r.user_id 
    AND u.user_id = t.user_id
    AND l.user_id = u.user_id
    GROUP BY u.user_id `;

  const tweetsCount = await db.all(getUserTweetsQuery);
  response.send(tweetsCount);
});
module.exports = app;
