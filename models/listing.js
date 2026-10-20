const mongoose=require("mongoose");
const {Schema}=mongoose;
const ListingSchema=new mongoose.Schema({
     title: {
        type:String,
        required:true
    },
    description: String, 
    image:{
        filename:String,
        url:String
    },
    price: Number,
    location: String,
    country:String,
    review:[
        {
            type:Schema.Types.ObjectId,
            ref:"Review"
        }
    ]

});

const Listing = mongoose.model("Listing",ListingSchema);
module.exports=Listing;