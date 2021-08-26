var express = require('express')
var app = express()
app.use(express.static(__dirname+'/public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
var cors = require('cors')
app.use(cors())
var server = app.listen(8088,()=>{
    console.log('Answer Controller Started')

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
//const { check_user, check_question} = require('./input_validate')

var request = require('request')

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

        console.log(q_counter)

    function cleanup(){
        dbo.collection('globals').updateOne({'q_num':initial_q_counter},{$set:{'q_num':q_counter}},(err,result)=>{
            console.log('Server Closed')
            process.exit(1)

        })
    }

    process.on('exit',cleanup)
    process.on('SIGINT',cleanup)

    //console.log(search_user('abc'))

    app.get('/answers',(req,res)=>{
        dbo.collection(col_name_q).find({'PostTypeId':2}).toArray((err,result)=>{
            if(err) throw err
            res.send(result)
        })
    })
   
    app.get('/answers/:answer_id',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
            if(err) throw err
            if(result.length == 1){
                var answer = result[0]
                dbo.collection(col_name_q).updateOne({'PostTypeId':2,'Id':answer_id},{$inc:{'ViewCount':1}},(err,result)=>{
                    if(err) throw err
                    console.log(result)

                    answer.ViewCount+=1
                    res.send(answer)
                })
                
            }
            else{
                //res.render('invalid_answer.jade')
                res.send('Invalid Answer ID')
            }
        })
    })
    app.post('/answers/:answer_id/accept',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        var token = req.headers['x-access-token']

        if(token==null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{
                if(result.length == 1 && validate_user(token,result[0])){
                    
                    var User = result[0]
                    var ActionUserId = result[0].Id

                dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                    if(err) throw err
                    if(result.length == 1){
                        var OwnerUserId = result[0].OwnerUserId
                        var question_id = result[0].ParentId
                        dbo.collection(col_name_q).find({'PostTypeId':1,'Id':question_id}).toArray((err,result)=>{
                            if(err) throw err
                            if(result.length==1 && result[0].OwnerUserId == User.Id){
                                if(result[0].AcceptedAnswerId!=-1){
                                    res.send('Contains An Already Accepted Answer,Undo that to Accept this one')
                                }
                                //console.log(result[0].ClosedDate)
                                else if(result[0].ClosedDate==null)
                                {
                                    dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':question_id},{$set:{'AcceptedAnswerId':answer_id,'ClosedDate':Date.now()}},(err,result)=>{
                                        if(err) throw err
                                        console.log(result)

                                        new Promise((resolve,reject)=>{
                                            if(ActionUserId != OwnerUserId){
                                                console.log('inside noti call')
                                                request.post({
                                                    headers:{'content-type':'application/json',
                                                        'x-access-token':token},
                                                    url:`http://localhost:8083/User/${OwnerUserId}/push`,
                                                    body:JSON.stringify({
                                                        Body: "Congo!!!! "+User.username + " has accepted your answer on this question",
                                                        PostId:answer_id
                                                    })
                                                },(err,response)=>{
                                                    if(err) throw err
                                                    console.log(response.body)
                                                    
                                                })
                                            }
                                            resolve()
                                            
                                        }).then(()=>{
                                            res.redirect(`/answers/${answer_id}`)
                                        })
                                    })
                                }
                                else{
                                    res.send('Question is already Closed')
                                }
    
    
                            }
                            else{
                                //res.render('invalid_answer.jade')
                                res.send('Invalid Answer ID')        
                            }
                        })
    
                    }
                    else{
                        //res.render('invalid_answer.jade')
                        res.send('Invalid Answer ID')
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
    app.post('/answers/:answer_id/accept/undo',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        var token = req.headers['x-access-token']

        if(token==null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{
                if(result.length == 1 && validate_user(token,result[0])){
                    
                    var User = result[0]
                
                dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                    if(err) throw err
                    if(result.length == 1){
                        
                        var question_id = result[0].ParentId
                        dbo.collection(col_name_q).find({'PostTypeId':1,'Id':question_id}).toArray((err,result)=>{
                            if(err) throw err
                            if(result.length==1  && User.Id == result[0].OwnerUserId){
                                if(result[0].AcceptedAnswerId==answer_id && result[0].ClosedDate!=null)
                                {
                                    dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':question_id},{$set:{'AcceptedAnswerId':-1,'ClosedDate':null}},(err,result)=>{
                                        if(err) throw err
                                        console.log(result)
                                        res.redirect(`/answers/${answer_id}`)
                                    })
                                }
                                else{
                                    res.send('Contains No Accepted Answer')
                                }
                            }
                            else{
                                //res.render('invalid_answer.jade')
                                res.send('Invalid Question ID')        
                            }
                        })
    
                    }
                    else{
                        //res.render('invalid_answer.jade')
                        res.send('Invalid Answer ID')
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
    // app.get('/answers/:answer_id/comments',(req,res)=>{
    //     var answer_id = parseInt(req.params.answer_id)
    //     dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
    //         if(err) throw err
    //         if(result.length == 1){
                
    //             var question_id = result[0].ParentId
    //             dbo.collection(col_name_q).find({'PostTypeId':1,'Id':question_id}).toArray((err,result)=>{
    //                 if(err) throw err
    //                 if(result.length==1){
    //                     if(result.AcceptedAnswerId!=-1)
    //                     {
    //                         dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':question_id},{$set:{'AcceptedAnswerId':-1,'ClosedDate':null}},(err,result)=>{
    //                             if(err) throw err
    //                             console.log(result[0])
    //                             res.redirect(`/questions/${question_id}`)
    //                         })
    //                     }
    //                     else{
    //                         res.send('Contains No Accepted Answer')
    //                     }


    //                 }
    //                 else{
    //                     //res.render('invalid_answer.jade')
    //                     res.send('Invalid Question ID')        
    //                 }
    //             })

    //         }
    //         else{
    //             //res.render('invalid_answer.jade')
    //             res.send('Invalid Answer ID')
    //         }
    //     })
    // })

    app.post('/answers/:answer_id/delete',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        var token = req.headers['x-access-token']

        if(token==null){
            res.redirect('/login')
        }
        else{
            dbo.collection(col_name_u).find({'token':token}).toArray((err,result)=>{

                if(result.length == 1 && validate_user(token,result[0])){
                    
                    var User = result[0]

                dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                    if(err) throw err
                    if(result.length == 1 && result[0].OwnerUserId == User.Id){

                        dbo.collection(col_name_q).find({'Id':result[0].ParentId}).toArray((err,result)=>{
                            if(result.length == 1){
                                var question_id = result[0].Id
                                if(result[0].AcceptedAnswerId == answer_id){
                                    res.send('Cant Delete an Accepted Answer')
                                }
                                else{
                                    dbo.collection(col_name_q).deleteOne({'PostTypeId':2,'Id':answer_id},(err,result)=>{
                                        if(err) throw err
                                        console.log(result)
                                        res.redirect(`http://localhost:8089/questions/${question_id}`)
                                    })
                                }
                            }   
                            else{
                                //res.render('invalid_answer.jade')
                                res.send('Invalid Question ID')         
                            } 
                        })
                    }
                    else{
                        //res.render('invalid_answer.jade')
                        res.send('Invalid Answer ID')
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

    app.post('/answers/:answer_id/edit',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        var token = req.headers['x-access-token']

        request.post({
            headers:{
                'content-type':'application/json',
                'x-access-token':token
            },
            url:`http://localhost:8089/questions/${answer_id}/edit`,
            body : JSON.stringify(req.body)
        },(err,response)=>{
            if(err)
                throw err
            console.log(response.body)
            if(response.body=='Success'){
                res.redirect(`/answers/${answer_id}`)
            }
            else
                res.send(response.body)
        })
        
    })
    app.get('/answers/:answer_id/:vote',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        var vote = req.params.vote
        var token = req.headers['x-access-token']

        request.get({
            headers:{
                'content-type':'application/json',
                'x-access-token':token
            },
            url:`http://localhost:8089/questions/${answer_id}/${vote}`,
        },(err,response)=>{
            if(err)
                throw err
            console.log(response.body)
            if(response.body=='Success'){
                res.redirect(`/answers/${answer_id}`)
            }
            else
                res.send(response.body)
        })
        
    })
    app.get('/answers/:answer_id/:vote/undo',(req,res)=>{
        var answer_id = parseInt(req.params.answer_id)
        var vote = req.params.vote
        var token = req.headers['x-access-token']

        request.get({
            headers:{
                'content-type':'application/json',
                'x-access-token':token
            },
            url:`http://localhost:8089/questions/${answer_id}/${vote}/undo`,
        },(err,response)=>{
            if(err)
                throw err
            console.log(response.body)
            if(response.body=='Success'){
                res.redirect(`/answers/${answer_id}`)
            }
            else
                res.send(response.body)
        })
        
    })

    })

})
