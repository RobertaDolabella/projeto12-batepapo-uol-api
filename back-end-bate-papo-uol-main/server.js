import express from 'express'
import cors from 'cors'
import {Db, MongoClient, ObjectId} from 'mongodb'
import axios from 'axios'
import dotenv from 'dotenv'

const server = express();

server.use(express.json());
server.use(cors());

dotenv.config();

const client = new MongoClient('mongodb://127.0.0.1:27017')
let db;
client.connect().then(()=>{
    db=client.db('uol')
})
server.post('/participants', async (request, response)=>{
    const newName = request.body
   console.log(newName)
   const loginArray = await db.collection('login').find().toArray()

    if(!newName){
        response.sendStatus(422)
        return
    }
    if(loginArray.some((login)=>login.name===newName.name)){
        response.sendStatus(409)
        console.log("deu certo")
        return
    }

    const dataLogin = {
        name: newName.name,
        lastStatus: Date.now()
    }
    db.collection('login').insertOne(dataLogin).then(()=>{
        response.sendStatus(201)
    })
    const dataStatus ={
        from: newName, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time: new Date().getTime()
    }
    db.collection('mensagem').insertOne(dataStatus)
})

server.get('/participants', async(request, response)=>{
    const loginArray = await db.collection('login').find().toArray()

    response.send(loginArray)
})
server.listen(5000)