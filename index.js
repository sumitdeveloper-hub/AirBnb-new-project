if(process.env.NODE_ENV !="production"){
    require('dotenv').config();
}

const express=require("express");
const app=express();
const path=require('path');
const mongoose = require('mongoose');
const Listing=require("./models/listing.js");
const alldata=require("./init/data.js");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const {listingSchema}=require("./schema.js");
const {reviewSchema}=require("./schema.js");
const Review=require("./models/review.js");
const cookieParser=require("cookie-parser");
const session=require("express-session");
const MongoStore = require('connect-mongo').default;
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");
const { isLoggedin, saveRedirectUrl } = require("./middleware.js");
const dbUrl=process.env.MONGO_URL;
const {storage}=require("./cloudConfig.js");

const multer  = require('multer')
const upload = multer({ storage });


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);

app.use(cookieParser("secretCode"));

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600
});
store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});
const sessionObject={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expire:Date.now() + 7 * 24 * 60 * 60 * 100,
        maxAge:7 * 24 * 60 * 60 * 100,
        httpOnly:true
    }
};

app.use(session(sessionObject));
app.use(flash());


// passport-work with it 
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
})

// app.get("/demouser", (req, res, next) => {
//     let fakeUser = new User({
//         email: "student@nsut.ac.in",
//         username: "sumit-sharma"
//     });

//     User.register(fakeUser, "helloworld", (err, registeredUser) => {
//         if (err) {
//             return next(err);
//         }
//         res.send(registeredUser);
//     });
// });

const validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    if(error){
        throw new ExpressError(404,error);
    }else{
        next();
    }
}

const validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
    if(error){
        throw new ExpressError(404,error);
    }else{
        next();
    }
}


main().then(()=>{
    console.log("connection made to DB");
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
}

app.get("/", (req, res) => {
    res.redirect("/listings");
});
// getting started with the signup process;
app.get("/signup",(req,res)=>{
    res.render("users/signup.ejs");
})

app.post("/signUp",async (req,res)=>{
    try{
    let {username,email,password}=req.body;
    let newUser=new User({email,username});
    const registeredUser=await User.register(newUser,password);
    req.login(registeredUser,(err)=>{
        if(err){
            next(err);
        }
        req.flash("success","user was registered");
        res.redirect("/listings");
    })
    console.log(registeredUser);
    }catch(e){
        req.flash("error",e.message);
        res.redirect("/signup");
    }
});
// login process;
app.get("/login",(req,res)=>{
    res.render("users/login.ejs");
})

app.post("/login",saveRedirectUrl,passport.authenticate("local",{failureRedirect:'/login',failureFlash:true}),async(req,res)=>{
    req.flash("success","welcome to wanderLust,You're loggedin");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);

})
// logout process
app.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","you're loggout successfully");
        res.redirect("/listings");
    })
})
// just sending cookies
app.get("/getCookies",(req,res)=>{
    res.cookie("madeIn","India",{signed:true});
    res.send("hey i have sended you cookies");
})

// route for the listing 
app.get("/listings",async (req,res)=>{
    let data = await Listing.find({});
    res.render("listing.ejs",{data});
})

// new route
app.get("/listings/new",isLoggedin,(req,res)=>{
    res.render("new.ejs");
})
// post route
app.post("/listings",upload.single('image'),wrapAsync(async (req,res,next)=>{ 
    let url=req.file.path;
    let filename=req.file.filename;
    console.log(url,"...",filename); 
        let newlisting=new Listing(req.body.listing);
        newlisting.image={url,filename};
        await newlisting.save();
        req.flash("success","New Listing created");
        res.redirect("/listings");   
}));


// show route
app.get("/listings/:id",wrapAsync(async (req,res)=>{
    let {id}=req.params;
    let datas=await Listing.findById(id).populate("review");
    if(!datas){
        req.flash("error","listing you requested for does not exist");
        res.redirect("/listings");
    }
    // console.log(datas);
    res.render("show.ejs",{datas});
}))

// edit route 
app.get("/listings/:id/edit",isLoggedin,wrapAsync(async (req,res)=>{
     let {id}=req.params;
    let listing=await Listing.findById(id);
    res.render("edit.ejs",{listing});
}))
//put route
app.put("/listings/:id",isLoggedin,upload.single('image'),validateListing,wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let listing = await Listing.findByIdAndUpdate(id,{...req.body.listing});
    if(typeof req.file!=="undefined"){
        let url=req.file.path;
        let filename=req.file.filename;
        listing.image={url,filename};
        await listing.save();
    }
        

    req.flash("success","listing updated");
    res.redirect("/listings");
}))

// delete route
app.delete("/listings/:id",isLoggedin,wrapAsync(async (req,res)=>{
    let {id}=req.params;
    let deleted = await Listing.findByIdAndDelete(id);
    console.log(deleted);
    req.flash("success","listing deleted");
    res.redirect("/listings");
}))
app.get("/*splat", (req, res,next) => {
    next(new ExpressError(400,"page not found"));
});

//listing review addition post route
app.post("/listing/:id/review",validateReview,wrapAsync(async(req,res)=>{
    let listing=await Listing.findById(req.params.id);
    let newReview=new Review(req.body.review);

    listing.review.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success","new review added")
    console.log("new Reviews saved");
    res.redirect(`/listings/${listing.id}`);
}));
// deletion of the review
app.delete("/listing/:id/review/:reviewId",wrapAsync(async (req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{review:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","review deleted");
    res.redirect(`/listings/${id}`);
}))

// error handling middleware
app.use((err,req,res,next)=>{
    let {status,message}=err;
    console.log(err);
    res.render("error.ejs",{message});
})
app.listen(8080,()=>{
    console.log("port started at 8080");
})