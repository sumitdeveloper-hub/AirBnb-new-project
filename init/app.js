if (process.env.NODE_ENV != "production") {
    require('dotenv').config({ path: "../.env" });
}
const Listing=require("../models/listing.js");
const mongoose=require("mongoose");
const alldata=require("../init/data.js");
const dbUrl=process.env.MONGO_URL;
main().then(()=>{
    console.log("connection made to DB");
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
}

Listing.insertMany(alldata.data);
