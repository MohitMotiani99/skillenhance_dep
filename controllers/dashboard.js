var MongoClient=require('mongodb').MongoClient
var express=require('express')
var request = require('request')
var app = express()
var bodyparser = require("body-parser")
//var url="mongodb://127.0.0.1:27017/";
var url="mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority"
//var mydb="SkillEnhancementPortal"
var mydb="skillenhancement"
//var collection="question"
var collection="questionAnswer"
var collection2="user"
var collection3="comments"
var username=""
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

var server = app.listen(3300,function(){
  console.log("Dashboard Controller started")
})

MongoClient.connect(url,function(err,db){
    if(err)
      throw err
    dbo=db.db(mydb)
    console.log('sep Database Connected')
    
    app.post('/login',(req,res)=>{

    })
    app.post('/register',(req,res)=>{

    })

    app.post('/mainpage2',(req,res)=>{
      dbo.collection(collection).find({'PostTypeId':1}).toArray((err,result)=>{
        var ans = {
          'questions':result
        }
        dbo.collection(collection).find({'PostTypeId':2}).toArray((err,result)=>{
          ans.answers = result
          res.send(ans)
        })        
      })
    })

        
    app.post('/searchposts',(req,res)=>{
      var search_string = req.body.search_string
      console.log(search_string)
      var search_words = new Set(search_string.split(' '))
      let promise = Promise.resolve()

      var stop_words = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"]

      new Promise((resolve,reject)=>{
        stop_words.forEach(sw=>search_words.delete(sw))
        console.log('set is ')
        console.log(search_words)
        if(search_words.size==0)
        res.send('No Context in the Search Phrase')
        else
        resolve()
      }).then(()=>{
        var q_set = new Set()
        var a_set = new Set()
          request.get({
            headers:{'content-type':'application/json'},
            url:'http://3.15.22.27:8089/questions'
            },(err,response,body)=>{
            if(err) throw err
              //console.log(body)
              //console.log(typeof body)
              //console.log(body)
              new Promise((resolve,reject)=>{
                search_words.forEach(word => {
                  console.log(word)
                  JSON.parse(body).filter((question) => {return (question.Title.indexOf(word) >= 0 || question.Body.indexOf(word) >= 0 )}).map((question) => {console.log('Hi');q_set.add(JSON.stringify(question))})
                })
                resolve()
              }).then(()=>{
                console.log(q_set)
  
                new Promise((resolve,reject)=>{
                  request.get({
                    headers:{'content-type':'application/json'},
                    url:'http://3.15.22.27:8088/answers'
                    },(err,response,body)=>{
                    if(err) throw err
          
                    
                    search_words.forEach(word=>{
                      JSON.parse(body).filter((answer)=>{return answer.Body.indexOf(word)>=0}).map((answer)=>a_set.add(JSON.stringify(answer)))
                    })
                  
                    resolve()
  
                          
                })
                
              }).then(()=>{
                console.log(a_set)
  
                var ans ={
                  'questions':Array.from(q_set).map((question)=>JSON.parse(question)),
                  'answers':Array.from(a_set).map((answer)=>JSON.parse(answer))
                }
                console.log(ans)
                res.send(ans)
              })
              
  
                  
      
  
              })
          })
      })

      
    })
    
    app.get('/:posts/sort/:base/:type',(req,res)=>{
      var type = req.params.type
      var base = req.params.base
      var posts = req.params.posts
      var host_url;
      if(posts == 'questions')
      host_url='http://3.15.22.27:8089/questions'
      else if(posts == 'answers')
      host_url='http://3.15.22.27:8088/answers'
      request.get({
        headers:{'content-type':'apllication/json'},
        url:host_url
      },(err,response,body)=>{
        var questions = JSON.parse(body)
        if(err) throw err
        new Promise((resolve,reject)=>{
          if(type == 'desc')
          questions.sort((q1,q2)=>q2[base] - q1[base])
          else if(type == 'asc')
          questions.sort((q1,q2)=>q1[base] - q2[base])

          console.log(questions)
          
          resolve()
        }).then(()=>{
          res.send(questions)
        })
      })
    })
    app.get('/trending',(req,res)=>{
      request.get({
        headers:{'content-type':'application/json'},
        url:'http://3.15.22.27:3300/questions/sort/ViewCount/desc'
      },(err,response,body)=>{
        res.send(JSON.parse(body))
      })
    })

    app.post("/searchuser",(req,res)=>{
      var name=(req.body.searchname).split(":")[1]
      console.log(name)
      var users=[]    //holds id of user's name
      var searchuser=[]
      var question=[]
      var answer=[]
      dbo.collection(collection2).find({username:name}).toArray(function(arr,result){
        //console.log(result)
        for (i=0;i<result.length;i++)
        {
            users.push(result[i].Id)
            searchuser.push(result[i])
        }
        //console.log(users) 
        //console.log(searchuser)       
      })
      dbo.collection(collection).find({}).toArray(function(arr,result){
        for (i=0;i<users.length;i++)
        {
          questions_count=0
          answer_count=0
          for (j=0;j<result.length;j++)
          {
            if (users[i]==result[j].OwnerUserId)
            {
               if (result[j].PostTypeId==1)
               {
                 questions_count=questions_count+1
                 //question[i]=result[j].Title
               }
               if (result[j].PostTypeId==2)
               {
                 answer_count=answer_count+1
                 //answer.push(result[j].Body)
               }
            }
          }
          //searchuser[i].push(questions_count,answer_count)
          searchuser[i]["question_count"]=questions_count
          searchuser[i]["answer_count"]=answer_count
          //console.log(searchuser)
        }
        res.send(searchuser)
    })      
    })
    app.post('/searchuser2',(req,res)=>{
      console.log('hi from search2')
      var searchname = req.body.searchname.split(':')[1]
      console.log(searchname)
      var cnt =0
      
      dbo.collection(collection2).find({'username':searchname}).toArray((err,result)=>{
        
        
        
        
        
        new Promise((resolve,reject)=>{
          var ans=[]

        result.forEach((u)=>{
          
            sol={}
            console.log(u)
            sol={
              'user':u
            }
            new Promise((resolve,reject)=>{
            dbo.collection(collection).find({"PostTypeId":1,"OwnerUserId":u.Id}).toArray((err,result)=>{
              sol['q_count']=result.length

              dbo.collection(collection).find({"PostTypeId":2,"OwnerUserId":u.Id}).toArray((err,result)=>{
                sol['a_count']=result.length
                console.log(sol)
                ans.push(sol)

                resolve()
              })
            })
            
            
            }).then(()=>{})
        })
        resolve()
      }).then(()=>{res.send(ans)})
      
    })
    
      
    })
})
