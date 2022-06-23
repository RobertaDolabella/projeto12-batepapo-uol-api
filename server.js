import express from 'express'
import cors from 'cors'
import {Db, MongoClient} from 'mongodb'
import dotenv from 'dotenv'

const server = express();

server.use(express.json());
server.use(cors());

dotenv.config();

const client = new MongoClient(process.env.URL_MONGO)
let db;
client.connect().then(()=>{
    db=client.db('uol')
})
server.post('/participants', (request, response)=>{
    const newName = request.body
    const time = MongoClient
    const nameArray = db.collection('name').find().toArray()
    if(!newName){
        response.sendStatus(422)
        return
    }
    if(nameArray.some((name)=>name===newName)){
        response.sendStatus(409)
        return
    }

    const dataName = {
        name: newName,
        lastStatus: Date.now()
    }
    db.collection('name').insertOne(dataName).then(()=>{
        response.sendStatus(201)
    })
    const dataStatus ={
        from: newName, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time: new Date().getTime()
    }
    db.collection('mensagem').insertOne()
})

server.listen(5000)