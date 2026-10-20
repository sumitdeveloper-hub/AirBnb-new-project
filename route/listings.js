const express=require("express");
const router=express.Router();

// route for the listing 
router.get("/listings",async (req,res)=>{
    let data = await Listing.find({});
    res.render("listing.ejs",{data});
})

// new route
router.get("/listings/new",(req,res)=>{
    res.render("new.ejs");
})
// post route
router.post("/listings",validateListing,wrapAsync(async (req,res,next)=>{ 
        let newlisting=new Listing(req.body.listing);
        await newlisting.save();
        res.redirect("/listings");   
}));

// show route
router.get("/listings/:id",wrapAsync(async (req,res)=>{
    let {id}=req.params;
    let datas=await Listing.findById(id).populate("review");
    // console.log(datas);
    res.render("show.ejs",{datas});
}))

// edit route 
router.get("/listings/:id/edit",wrapAsync(async (req,res)=>{
     let {id}=req.params;
    let listing=await Listing.findById(id);
    res.render("edit.ejs",{listing});
}))
//put route
router.put("/listings/:id",validateListing,wrapAsync(async(req,res)=>{
    let {id}=req.params;
    await Listing.findByIdAndUpdate(id,{...req.body.listing});
    res.redirect("/listings");
}))

// delete route
router.delete("/listings/:id",wrapAsync(async (req,res)=>{
    let {id}=req.params;
    let deleted = await Listing.findByIdAndDelete(id);
    console.log(deleted);
    res.redirect("/listings");
}))

//listing review addition post route
router.post("/listing/:id/review",validateReview,wrapAsync(async(req,res)=>{
    let listing=await Listing.findById(req.params.id);
    let newReview=new Review(req.body.review);

    listing.review.push(newReview);

    await newReview.save();
    await listing.save();

    console.log("new Reviews saved");
    res.redirect(`/listings/${listing.id}`);
}));
// deletion of the review
router.delete("/listing/:id/review/:reviewId",wrapAsync(async (req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{review:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
}))

module.exports=router;