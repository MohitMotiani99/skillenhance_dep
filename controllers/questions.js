var express = require('express')
var app = express()
app.use(express.static(__dirname+'/public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
var cors = require('cors')
app.use(cors())

var request = require('request')

var server = app.listen(8089,()=>{
    console.log('Question Controller Started')

})

var MongoClient = require('mongodb').MongoClient
// var url = 'mongodb://127.0.0.1:27017'
// var db_name = 'sep'
// var col_name_q = 'questions'
// var col_name_u = 'users'


var url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
var db_name = 'skillenhancement'
var col_name_q = 'questionAnswer'
var col_name_u = 'user'


var validate_user = require('./authorize')

MongoClient.connect(url,(err,db)=>{
    if(err)throw err
    dbo = db.db(db_name)

    console.log('sep Database Connected')

    var q_counter;
    var initial_q_counter

    dbo.collection('globals').find({}).toArray((err,result)=>{
        console.log(result)
        q_counter = result[0].q_num
        initial_q_counter = q_counter

        n_counter = result[0].n_num
        initial_n_counter=n_counter

        console.log(q_counter)

    function cleanup(){
        dbo.collection('globals').updateOne({'q_num':initial_q_counter},{$set:{'q_num':q_counter}},(err,result)=>{
            console.log('Server Closed')
            process.exit(1)

        })
    }

    process.on('exit',cleanup)
    process.on('SIGINT',cleanup)
   
    
    // function check_user(token){
    //     dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{
    //         if(result.length == 1 && validate_user(token,result[0]))
    //             {
    //                 console.log('Yes')
    //                 return result[0]
    //             }
    //         else
    //         {
    //             console.log('No')
    //             return null
    //         }
                
    //     })
    // }



    // dbo.createCollection(col_name_q,(err,result)=>{
    //     if(err) throw err
    //     console.log('Question Collection is Being Used')
    // })

    // dbo.createCollection(col_name_u,(err,result)=>{
    //     if(err) throw err
    //     console.log('Users Collection is Being Used')
    // })

    app.get('/questions/:question_id',(req,res)=>{
        var question_id = parseInt(req.params.question_id)
        //var question = check_question(question_id)
        console.log(question_id)
        console.log(typeof question_id)

        dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray((err,result)=>{
            console.log(result)
            if(result.length == 1)
                {
                    var question = result[0]
                    dbo.collection(col_name_q).updateOne({'Id':question_id,'PostTypeId':1},{$inc:{'ViewCount':1}},(err,result)=>{
                        if(err) throw err
                        console.log(result)

                        question.ViewCount+=1
                        res.send(question)
                    })
                    
                }
            else
                {
                   //res.render('invalid_question.jade')
                   res.send('Invalid Question ID')

                }
        })
        
        // if(question!=null){
        //     res.send(JSON.stringify(question))
        // }
        // else{
        //     //res.render('invalid_question.jade')
        //     res.send('Invalid Question ID')
        // }
    })
    app.get('/questions',(req,res)=>{
            
            console.log('/questions')
            dbo.collection(col_name_q).find({'PostTypeId':1}).toArray((err,result)=>{
                //res.render('user_profile.jade') //for answers & comments also
                res.send(result)
            })
        
    })
    app.post('/questions/add',(req,res)=>{
        
        var data = req.body
        var token = req.headers['x-access-token']

        console.log(token)
        console.log(typeof token)

        if(token == null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{
                if(err) throw err

                console.log(result)
                if(result.length==1 && validate_user(token,result[0])){

                    var q_obj={
                        Id:q_counter++,
                        PostTypeId:1,
                        AcceptedAnswerId:-1,
                        CreationDate:Date.now(),
                        Score:0,
                        ViewCount:0,
                        OwnerUserId:result[0].Id,
                        Title:data.Title,
                        Body:data.Body,
                        Tags:data.Tags,
                        ClosedDate:null
                    }

                    dbo.collection(col_name_q).insertOne(q_obj,(err,result)=>{
                        if(err) throw err
                        console.log(result)
                        res.redirect(`/questions/${q_obj.Id}`)
                    })

                    //should be last statement
                    
                }
                else{

                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }
            })
        }

    })
    app.get('/questions/:question_id/:vote',(req,res)=>{

        var question_id = parseInt(req.params.question_id)
        var vote = req.params.vote
        var token = req.headers['x-access-token']
        if(token==null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{
                if(err) throw err
                if(result.length==1 && validate_user(token,result[0])){
                    
                    var User = result[0]
                    var ActionUserId = result[0].Id

                    dbo.collection(col_name_q).find({'Id':question_id}).toArray((err,result)=>{
                        if(result.length==1){
                            var OwnerUserId = result[0].OwnerUserId
                            var PostTypeId = result[0].PostTypeId
                            var upd_sel={
                                'Id':question_id
                            }
                            var upd_params;

                            if(vote == 'upvote'){
                                upd_params = {
                                    $inc:{
                                        'Score': 1
                                    }
                                }
                            }
                            else if(vote == 'downvote'){
                                upd_params = {
                                    $inc:{
                                        'Score': -1
                                    }
                                }
                            }
                            
                            dbo.collection(col_name_q).updateOne(upd_sel,upd_params,(err,result)=>{
                                if(err) throw err
                                console.log(result)
                                
                                console.log('action user id'+ActionUserId)
                                console.log('owner user id'+OwnerUserId)

                                new Promise((resolve,reject)=>{
                                    if(ActionUserId != OwnerUserId){
                                        console.log('inside noti call')
                                        request.post({
                                            headers:{'content-type':'application/json',
                                                'x-access-token':token},
                                            url:`http://localhost:8083/User/${OwnerUserId}/push`,
                                            body:JSON.stringify({
                                                Body: User.username + " has Reacted On your Post",
                                                PostId:question_id
                                            })
                                        },(err,response)=>{
                                            if(err) throw err
                                            console.log(response.body)
                                            
                                        })
                                    }
                                    resolve()
                                    
                                }).then(()=>{
                                    if(PostTypeId == 1){
                                        res.redirect(`/questions/${question_id}`)
                                    }
                                    else if(PostTypeId == 2)
                                        res.send('Success')

                                })
                                

                            })


                        }
                        else{
                            //res.render('invalid_question.jade')
                            res.send('Invalid Post ID')
                        }
                    })

                }
                else{
                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }
            })
        }

    })

    app.get('/questions/:question_id/:vote/undo',(req,res)=>{

        var question_id = parseInt(req.params.question_id)
        var vote = req.params.vote
        var token = req.headers['x-access-token']
        if(token==null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{
                if(err) throw err
                if(result.length==1 && validate_user(token,result[0])){

                    var User = result[0]
                    var ActionUserId = result[0].Id

                    dbo.collection(col_name_q).find({'Id':question_id}).toArray((err,result)=>{
                        if(result.length==1){
                            var OwnerUserId = result[0].OwnerUserId

                            var PostTypeId = result[0].PostTypeId


                            var upd_sel={
                                'Id':question_id
                            }
                            var upd_params;

                            if(vote == 'upvote'){
                                upd_params = {
                                    $inc:{
                                        'Score': -1
                                    }
                                }
                            }
                            else if(vote == 'downvote'){
                                upd_params = {
                                    $inc:{
                                        'Score': 1
                                    }
                                }
                            }
                            
                            dbo.collection(col_name_q).updateOne(upd_sel,upd_params,(err,result)=>{
                                if(err) throw err
                                console.log(result)
                                
                                console.log('action user id'+ActionUserId)
                                console.log('owner user id'+OwnerUserId)

                                new Promise((resolve,reject)=>{
                                    if(ActionUserId != OwnerUserId){
                                        console.log('inside noti call')
                                        request.post({
                                            headers:{'content-type':'application/json',
                                                'x-access-token':token},
                                            url:`http://localhost:8083/User/${OwnerUserId}/push`,
                                            body:JSON.stringify({
                                                Body: User.username + " has Reacted On your Post",
                                                PostId:question_id
                                            })
                                        },(err,response)=>{
                                            if(err) throw err
                                            console.log(response.body)
                                            
                                        })
                                    }
                                    resolve()
                                    
                                }).then(()=>{
                                    if(PostTypeId == 1){
                                        res.redirect(`/questions/${question_id}`)
                                    }
                                    else if(PostTypeId == 2)
                                        res.send('Success')

                                })
                            })

                            

                        }
                        else{
                            //res.render('invalid_question.jade')
                            res.send('Invalid Post ID')
                        }
                    })

                }
                else{
                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }
            })
        }

    })

    app.post('/questions/:question_id/delete',(req,res)=>{

        var question_id = parseInt(req.params.question_id)
        var token = req.headers['x-access-token']

        if(token == null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{

                if(result.length == 1 && validate_user(token,result[0])){

                    var User = result[0]

                    dbo.collection(col_name_q).find({'Id':question_id}).toArray((err,result)=>{
                        if(result.length == 1 && result[0].OwnerUserId==User.Id){
                            var PostTypeId = result[0].PostTypeId
                            dbo.collection(col_name_q).deleteOne({'Id':question_id},(err,result)=>{
                                if(err) throw err
                                console.log(result)

                                //res.redirect('/user/questions') //something like that

                                dbo.collection(col_name_q).find({'PostTypeId':2,'ParentId':question_id}).toArray((err,result)=>{
                                    var ans_set = new Set(result)

                                    new Promise((resolve,reject)=>{
                                        ans_set.forEach((answer)=>{
                                            console.log('inside noti call')
                                            new Promise((resolve,reject)=>{
                                                request.post({
                                                    headers:{'content-type':'application/json',
                                                        'x-access-token':token},
                                                    url:`http://localhost:8083/User/${answer.OwnerUserId}/push`,
                                                    body:JSON.stringify({
                                                        Body: User.username + " has deleted the post you answerd on",
                                                        PostId:question_id
                                                    })
                                                },(err,response)=>{
                                                    if(err) throw err
                                                    console.log(response.body)
                                                    
                                                })
                                                resolve()
                                            }).then(()=>{})
                                            
        
                                        })
                                        resolve()
                                    }).then(()=>{
                                        if(PostTypeId == 1){
                                            res.redirect('/questions')
                                        }
                                        else if(PostTypeId == 2)
                                            res.send('Success')
        
                                    })
                                    
                                })

                                
                            })
                        }
                        else{
                            //res.render('invalid_question.jade')
                            res.send('Invalid Question ID')
                        }
                    })

                }
                else{
                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }

            })
        }
    })

    app.post('/questions/:question_id/edit',(req,res)=>{

        console.log('hi')

        var question_id = parseInt(req.params.question_id)
        var token = req.headers['x-access-token']
        var data = req.body

        if(token == null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{

                if(result.length == 1 && validate_user(token,result[0])){

                    var User = result[0]

                    dbo.collection(col_name_q).find({'Id':question_id}).toArray((err,result)=>{
                        
                        if(result.length == 1 && result[0].OwnerUserId==User.Id){
                            if(result[0].ClosedDate!=null){
                                res.send('Question is Closed')
                            }
                            var PostTypeId = result[0].PostTypeId

                            var upd_sel={
                                'Id':question_id
                            }
                            let Title_new = (data.Title==undefined)?result[0].Title:data.Title
                            let Body_new = (data.Body==undefined)?result[0].Body:data.Body
                            let Tags_new = (data.Tags==undefined)?result[0].Tags:data.Tags
                            var upd_params;
                            if(PostTypeId == 1){
                                upd_params = {
                                    $set:{
                                        'Title':Title_new,
                                        'Body':Body_new,
                                        'Tags':Tags_new
                                    }
                                }
                            }
                            else if(PostTypeId == 2){
                                upd_params = {
                                    $set:{
                                        'Body':Body_new,
                                        'Tags':Tags_new
                                    }
                                }
                            }

                            dbo.collection(col_name_q).updateOne(upd_sel,upd_params,(err,result)=>{
                                if(err) throw err
                                console.log(result)
    

                                dbo.collection(col_name_q).find({'PostTypeId':2,'ParentId':question_id}).toArray((err,result)=>{
                                    var ans_set = new Set(result)

                                    new Promise((resolve,reject)=>{
                                        ans_set.forEach((answer)=>{
                                            console.log('inside noti call')
                                            new Promise((resolve,reject)=>{
                                                request.post({
                                                    headers:{'content-type':'application/json',
                                                        'x-access-token':token},
                                                    url:`http://localhost:8083/User/${answer.OwnerUserId}/push`,
                                                    body:JSON.stringify({
                                                        Body: User.username + " has Editted the post you answerd on",
                                                        PostId:question_id
                                                    })
                                                },(err,response)=>{
                                                    if(err) throw err
                                                    console.log(response.body)
                    
                                                })
                                                resolve()
                                            }).then(()=>{})
                                            
        
                                        })
                                        resolve()
    
                                    }).then(()=>{
                                        if(PostTypeId == 1){
                                            res.redirect(`/questions/${question_id}`)
                                        }
                                        else if(PostTypeId == 2)
                                            res.send('Success')

                                    })
                                        
                                })

                                //res.redirect('/user/questions') //something like that
                            })

                            
                        }
                        else{
                            //res.render('invalid_question.jade')
                            res.send('Invalid Post ID')
                        }
                    })

                }
                else{
                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }

            })
        }


    })
    
    app.post('/questions/:question_id/answers',(req,res)=>{

        console.log('hi')
        var question_id = parseInt(req.params.question_id)
        console.log(question_id)
        dbo.collection(col_name_q).find({'PostTypeId':2,'ParentId':question_id}).toArray((err,result)=>{
            if(err) throw err
            console.log(result)
            res.send((result))
        })

    })
    app.post('/questions/:question_id/answers/add',(req,res)=>{
        var question_id = parseInt(req.params.question_id)
        var token = req.headers['x-access-token']
        var data = req.body

        console.log('hi')

        if(token == null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{

                if(err) throw err

                if(result.length == 1 && validate_user(token,result[0])){
                    
                    var ActionUserId = result[0].Id

                    var User = result[0]

                    dbo.collection(col_name_q).find({'Id':question_id}).toArray((err,result)=>{
                        if(err) throw err
                        if(result.length == 1){
                            if(result[0].AcceptedAnswerId == -1 && result[0].ClosedDate==null){

                                var OwnerUserId = result[0].OwnerUserId

                            var a_obj={
                                'Id':q_counter++,
                                'PostTypeId':2,
                                'ParentId':question_id,
                                'CreationDate':Date.now(),
                                'Score':0,
                                'ViewCount':0,
                                'Body':data.Body,
                                'OwnerUserId':User.Id,
                                'Tags':data.Tags,
                                'ClosedDate':null
                            }

                            dbo.collection(col_name_q).insertOne(a_obj,(err,result)=>{
                                if(err) throw err
                                console.log(result)

                                console.log('action user id'+ActionUserId)
                                console.log('owner user id'+OwnerUserId)

                                if(ActionUserId != OwnerUserId){
                                    console.log('inside noti call')
                                    request.post({
                                        headers:{'content-type':'application/json',
                                            'x-access-token':token},
                                        url:`http://localhost:8083/User/${OwnerUserId}/push`,
                                        body:JSON.stringify({
                                            Body: User.username + " has answerd to your question",
                                            PostId:question_id
                                        })
                                    },(err,response)=>{
                                        if(err) throw err
                                        console.log(response.body)
                                        res.redirect(`http://localhost:8088/answers/${a_obj.Id}`)
                                        
                                        
        
                                    })
                                }

                            })
                            }
                            else{
                                res.send('Already Closed Question')
                            }
                            
                        }
                        else{
                            //res.render('invalid_question.jade')
                            res.send('Invalid Question ID')
                        }
                    })

                }
                else{
                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }

            })
        }


    })
    app.post('/questions/:question_id/close',(req,res)=>{
        var question_id = parseInt(req.params.question_id)
        var token = req.headers['x-access-token']

        if(token == null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{

                if(result.length == 1 && validate_user(token,result[0])){

                    var User = result[0]
                    console.log('User ---- '+User.Id)

                    dbo.collection(col_name_q).find({'Id':question_id}).toArray((err,result)=>{
                        console.log(result[0])
                        if(result.length == 1 && result[0].OwnerUserId==User.Id && result[0].ClosedDate==null){
                            var OwnerUserId = result[0].OwnerUserId

                            dbo.collection(col_name_q).updateOne({'Id':question_id},{$set:{'ClosedDate':Date.now()}},(err,result)=>{
                                if(err) throw err
                                console.log(result)


                                dbo.collection(col_name_q).find({'PostTypeId':2,'ParentId':question_id}).toArray((err,result)=>{
                                    var ans_set = new Set(result)

                                    new Promise((resolve,reject)=>{
                                        ans_set.forEach((answer)=>{
                                            console.log('inside noti call')
                                            new Promise((resolve,reject)=>{
                                                request.post({
                                                    headers:{'content-type':'application/json',
                                                        'x-access-token':token},
                                                    url:`http://localhost:8083/User/${answer.OwnerUserId}/push`,
                                                    body:JSON.stringify({
                                                        Body: User.username + " has Closed the post you answerd on",
                                                        PostId:question_id
                                                    })
                                                },(err,response)=>{
                                                    if(err) throw err
                                                    console.log(response.body)
                    
                                                })
                                                resolve()
                                            }).then(()=>{})
                                            
        
                                        })
                                        resolve()
    
                                    }).then(()=>{
                                        
                                            res.redirect(`/questions/${question_id}`)
                                        

                                    })
                                        
                                })


                                //res.redirect('/user/questions') //something like that
                                // res.redirect(`/questions/${question_id}`)
                            })
                        }
                        else{
                            //res.render('invalid_question.jade')
                            res.send('Invalid Question ID')
                        }
                    })

                }
                else{
                    //res.render('invalid_user.jade')
                    res.send('Invalid User')
                }

            })
        }

    })

    })

})
