const Listing=require("../models/listing.js");
const mongoose=require("mongoose");
const alldata=require("../init/data.js");
main().then(()=>{
    console.log("connection made to DB");
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/wanderLust2');
}

Listing.insertMany(alldata.data);
