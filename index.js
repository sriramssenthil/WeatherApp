var express = require('express'); 
var app = express(); 
var path = require("path");  
var fs = require("fs");  
var bp = require("body-parser");  
app.set("views", path.resolve(__dirname, "templates"));  
app.set("view engine", "ejs");  
app.use(bp.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
require('dotenv').config(); 

const request = require('request');
const ejs = require('ejs');

const apiKey = process.env.API_KEY;

const port = process.argv[2]; 
	 
app.listen(port, () =>{  
	process.stdout.write(`Web server started and running at http://localhost:${port}\n`);  
	process.stdout.write("stop to shutdown the server: ");        
}); 

process.stdin.setEncoding('utf-8');  
process.stdin.on("readable", () =>{  
	const command = process.stdin.read();  
	if (command){  
	    const comm = command.toString().trim()  
	    if(comm==="stop"){  
	        console.log("Shutting down the server");  
            process.exit(0);   
	    } else {  
	        console.log(`Invalid command: ${comm}`);  
	    }  
	        process.stdout.write("stop to shutdown the server: ");  
	        process.stdin.resume();  
	    }  
	}) 

const userName = process.env.MONGO_DB_USERNAME; 
const password = process.env.MONGO_DB_PASSWORD; 
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION}; 

const { MongoClient, ServerApiVersion } = require('mongodb'); 
const { response } = require('express'); 
const uri = `mongodb+srv://${userName}:${password}@cluster0.ipjcxz5.mongodb.net/?retryWrites=true&w=majority`; 
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }); 


app.get("/", (req, res) =>{  
    res.render("weather.ejs");  
});  

app.get("/display.ejs", (req, res) =>{  
    res.render("display.ejs");
});  

app.post("/", (req, res) => {
    const city = req.body.city;
    getWeatherData(city)
      .then(weatherData => {
        client.connect()
          .then(() => {
              if (weatherData.city === "NONE") {
                  res.render("display.ejs", weatherData);
                  return;
              }
            const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);
            collection.insertOne({
              city: weatherData.city,
              temp_f: weatherData.temp_f,
              temp_c: weatherData.temp_c,
              feels_f: weatherData.feels_f,
              feels_c: weatherData.feels_c,
              region: weatherData.region,
              country: weatherData.country
            })
              .then(async () => {
                const collection2=client.db(databaseAndCollection.db).collection(databaseAndCollection.collection) 
                let str = req.body.city;
                let words = str.split(' ');
                let capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
                str = capitalizedWords.join(' ');
                console.log(str)
                ret = await collection2.findOne({city: str}); 
                res.render('display.ejs', ret);
              })
              .catch(error => console.error('Error saving weather data to MongoDB:', error))
              .finally(() => client.close());
          })
          .catch(error => console.error('Error connecting to MongoDB:', error));
      })
      .catch(error => {
        console.error('Error retrieving weather data:', error);
      });
  });
  
  function getWeatherData(city) {
    return new Promise((resolve, reject) => {
      const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`;
      request(url, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          data=JSON.parse(body);
          console.log(data);
          if(data.error){
            variables = {
                temp_f : "NONE",
                temp_c : "NONE",
                city: "NONE",
                region: "NONE",
                country: "NONE",
                feels_f: "NONE",
                feels_c: "NONE"
            };
          } else {
                variables = {
                    temp_f : data.current.temp_f,
                    temp_c : data.current.temp_c,
                    city: data.location.name,
                    region: data.location.region,
                    country: data.location.country,
                    feels_f: data.current.feelslike_f,
                    feels_c: data.current.feelslike_c
                };
          }
          
          resolve(variables);
        }
      });
    });
  }
  
