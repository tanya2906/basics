const express=require('express');
const app=express();
const userModel=require('./models/user');
const postModel=require('./models/post');
const cookieParser = require('cookie-parser');
const jwt=require('jsonwebtoken');
const upload=require('./config/multerconfig');
const bcrypt = require('bcrypt');
const path =require('path');
/*const crypto=require('crypto');

const multer =require('multer');
*/
//const { render } = require('ejs');

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());
app.set('view engine','ejs');
/*
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12,(err,bytes)=>{
            const fn=bytes.toString('hex')+path.extname(file.originalname)
            cb(null,fn) //set file name
        });
        
    }
  })
  
  const upload = multer({ storage: storage })
  
*/
app.get('/',(req,res)=>{
    res.render('index');
});

app.get('/profile/upload',(req,res)=>{
    res.render('uploadprofilepic');
});
app.post('/upload',isLoggedIn,upload.single('image'),async(req,res)=>{
   // console.log(req.file);
   let user=await userModel.findOne({email:req.user.email});
   user.profilepic=req.file.filename;
   await user.save();
    res.redirect('/profile');
});

app.get('/login',(req,res)=>{
    res.render('login');
});
app.post('/login',async(req,res)=>{
    let {email,password}=req.body;
    let user=await userModel.findOne({email:req.body.email});
    //console.log(user);
    if(!user) return res.status(500).send('Something went wrong!');
    bcrypt.compare(password, user.password,(err,result)=>{
        if(result){ 
            let token=jwt.sign({email:email, userid:user._id},'secret');
            res.cookie('token',token);
            //console.log(token);
            res.redirect('/profile');
        } 
        else {return res.status(500).send('Something went wrong!!');}

    });
});
app.get('/logout',(req,res)=>{
    res.cookie('token','');
    res.redirect('/');
});
app.post('/register',async(req,res)=>{
    let {name,username,email,password,age}=req.body;
    let user=await userModel.findOne({email});
    if(user) return res.status(500).send('User already registered');
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async(err,hash)=>{
            let newUser=await userModel.create({
                name,
                username,
                email,
                password:hash,
                age
            });
            let token=jwt.sign({email:email, userid:user._id},'secret');
            res.cookie('token',token);
            res.send('registered');
        });
    });
});
app.post('/createPost',isLoggedIn,async(req,res)=>{
    
    let user=await userModel.findOne({email:req.user.email});
    let {content}=req.body;
    //create post
    let post=await postModel.create({
        user:user._id,//post ko btaya user kon hai
        content
    });
    //user ko btaya nayi post konsi use belong krti hai
    user.posts.push(post._id);
    await user.save(); //save user
    res.redirect('/profile');
});
app.get('/likePost/:id',isLoggedIn,async(req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate('user');
    //console.log(post);
    if(post.likes.indexOf(req.user.userid)===-1)
    {
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();
    res.redirect('/profile');
});
app.get('/editPost/:id',isLoggedIn,async(req,res)=>{
    //let user=await userModel.findOne({email:req.user.email});
    let post=await postModel.findOne({_id:req.params.id});

    //console.log(post);
    res.render('editPost',{post});
});
app.post('/editPost/:id',isLoggedIn,async(req,res)=>{
    //let user=await userModel.findOne({email:req.user.email});
    let {content}=req.body;
    //edit post
    let post=await postModel.findOneAndUpdate({_id:req.params.id},{content});
    res.redirect('/profile');
});
app.get('/profile',isLoggedIn,async(req,res)=>{
    //console.log('req.user',req.user);
    let user=await userModel.findOne({email:req.user.email}).populate('posts');
    //.populate('posts'); //to show all posts
    res.render('profile',{user});
});
//middleware
function isLoggedIn(req,res,next){
    if(!req.cookies.token) return res.redirect('/login');
    else{
        let data=jwt.verify(req.cookies.token,'secret');
        req.user=data;
        next();
    }
    
}
app.listen(3000);