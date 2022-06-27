import express from 'express'
import cors from 'cors'
import { Db, MongoClient, ObjectId } from 'mongodb'
import axios from 'axios'
import Joi from 'joi'
import dotenv from 'dotenv'
import dayjs from 'dayjs'

const server = express();

server.use(express.json());
server.use(cors());

dotenv.config();

const client = new MongoClient('mongodb://127.0.0.1:27017')
let db;
client.connect().then(() => {
    db = client.db('uol')
})

let newName;
server.post('/participants', async (request, response) => {
    newName = request.body

    const loginArray = await db.collection('login').find().toArray()

    if (!newName) {
        response.sendStatus(422)
        return
    }
    if (loginArray.some((login) => login.name === newName.name)) {
        response.sendStatus(409)
        return
    }

    const dataLogin = {
        name: newName.name,
        lastStatus: Date.now()
    }
    db.collection('login').insertOne(dataLogin).then(() => {
        response.sendStatus(201)
    })
    const dataStatus = {
        from: newName,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: new Date().getTime()
    }
    db.collection('mensagens').insertOne(dataStatus)
})

server.get('/participants', async (request, response) => {
    const loginArray = await db.collection('login').find().toArray()

    response.send(loginArray)
})

server.post('/messages', async (request, response) => {
    const mensagem = request.body
    const { user } = request.headers

    console.log(mensagem, user)


    const messageValidation = Joi.object({
        from: Joi.string().required,
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().required(),
        time: Joi.required()
    })

    const dataMensagem = { from:user , ...mensagem, time: dayjs().format('HH:MM:ss') }

    const validation = messageValidation.validate(dataMensagem)

    const inputMessage = await db.collection("mensagens").insertOne({ dataMensagem })


    response.sendStatus(201)

})

server.get('/messages', async (request, response) => {

    const { user } = request.headers

    const findMessages = await db.collection("mensagens").find().toArray()
    const filteredMessages = findMessages.filter((message) =>(message.dataMensagem.from === user||message.dataMensagem.to==="Todos"||message.dataMensagem.to===user))
    
    const limit = parseInt(request.query.limit)

    if (limit) {
        if (filteredMessages.length > limit) {
            console.log("entrou no limit")
            let splice = filteredMessages.length - limit
            const limitedMessages = filteredMessages.splice(splice, limit)
            response.send(limitedMessages)
            return
        }
        else{
            response.send(filteredMessages)
        }
    }
        response.send(filteredMessages)
})

server.post('/status', async (request, response)=>{

    const { user } = request.headers

    const dataStatus = {
        name: user,
        lastStatus: Date.now()
    }

    const loginArray = await db.collection('login').find().toArray()

    const statusList = await db.collection('status').find().toArray()

    if(!loginArray.some(participants=>participants.name===user)){
        response.sendStatus(404)
        return
    }

    if(statusList.some(userOn=>userOn.name===user)){
        db.collection('status').updateOne({"name":user}, { $set: { "lastStatus" : Date.now() } })
    }
    else{
        db.collection('status').insertOne(dataStatus)
    }
})
server.listen(5000)