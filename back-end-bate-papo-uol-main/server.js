import express from 'express'
import cors from 'cors'
import { Db, MongoClient, ObjectId } from 'mongodb'
import Joi from 'joi'
import dotenv from 'dotenv'
import dayjs from 'dayjs'

const server = express();

server.use(express.json());
server.use(cors());

dotenv.config();
console.log(process.env)
const client = new MongoClient(`${process.env.URL_MONGO}`)
// const client = new MongoClient('mongodb://127.0.0.1:27017')
let db;
client.connect().then(() => {
    db = client.db('uol')
})


server.post('/participants', async (request, response) => {

    const { name } = request.body

    const loginArray = await db.collection('login').find().toArray()

    if (!name) {
        response.sendStatus(422)
        return
    }
    if (loginArray.some((login) => login.name === name)) {
        response.sendStatus(409)
        return
    }

    const dataLogin = {
        name: name,
        lastStatus: Date.now()
    }
    db.collection('login').insertOne(dataLogin).then(() => {
        response.sendStatus(201)
    })
    const dataStatus = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('hh:mm:ss')
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

    const messageValidation = Joi.object({
        from: Joi.string().required,
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message','private_message'),
        time: Joi.required()
    })

    const dataMensagem = { from:user , ...mensagem, time: dayjs().format('hh:mm:ss') }

    const validation = messageValidation.validate(dataMensagem)

    const inputMessage = await db.collection("mensagens").insertOne({...dataMensagem })


    response.sendStatus(201)

})

server.get('/messages', async (request, response) => {
  
    const { user } = request.headers

    const findMessages = await db.collection("mensagens").find().toArray()
    const filteredMessages = findMessages.filter((message) =>(message.from === user||message.to==="Todos"||message.to===user))
    
    const limit = parseInt(request.query.limit)

    if (limit) {

        if (filteredMessages.length > limit) {
            let splice = filteredMessages.length - limit
            const limitedMessages = filteredMessages.splice(splice, limit)
            response.send(limitedMessages)
            return
        }
        else{
            response.status(201).send(filteredMessages)
            return
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
        await db.collection('status').updateOne({name :user}, { $set: {lastStatus : Date.now() } })
        response.sendStatus(200)
    }
    else{
        await db.collection('status').insertOne(dataStatus)
        response.sendStatus(200)
    }
})

server.delete('/messages/:ID_DA_MENSAGEM', async (request, response)=>{

    const { user } = request.headers
    const idMessage = request.params.ID_DA_MENSAGEM


    const messageList = await db.collection("mensagens").find({_id: ObjectId(idMessage)}).toArray()

    if(messageList.length===0){
        response.sendStatus(404)
        return
    }
    if(messageList[0].from !== user){
        response.sendStatus(401)
        return
    }
    else{
        db.collection("mensagens").deleteOne({_id: ObjectId(idMessage)})
        response.send(messageList)
        return
    }

    })

server.put('/messages/:ID_DA_MENSAGEM', async (request, response)=>{

    const idMessage = request.params.ID_DA_MENSAGEM
    const { user } = request.headers
    const message = request.body

    const messageToFind = await db.collection("mensagens").find({_id: ObjectId(idMessage)}).toArray()
 
    if(messageToFind.length===0){
        response.sendStatus(404)
        return
    }

    if(messageToFind[0].from !== user){
        response.sendStatus(401)
    }
  
    const messageValidation = Joi.object({
        from: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message','private_message')
    })
try{
    const messageToChange = { from: user, ...message, time: dayjs().format('hh:mm:ss')}
    const validation = messageValidation.validate(messageToChange)
    console.log("validou")
    const update = await db.collection('mensagens').updateOne({_id: ObjectId(idMessage)}, { $set: {text : message.text} })
    const messageList = await db.collection("mensagens").find().toArray()
    response.send(messageList)

}catch(error){
    response.sendStatus(422)
}



   
})    

setInterval(async function () {

    const statusList = await db.collection('status').find().toArray()

    const statusOut = statusList.filter(time=> time.lastStatus< Date.now()-10000)

    statusOut.forEach(userOut=>{
        const messageOut = {from: userOut.name,
         to: 'Todos', 
         text: 'sai da sala...', 
         type: 'status', 
         time: dayjs().format('hh:mm:ss')}

         db.collection('mensagens').insertOne(messageOut)

         db.collection('status').deleteOne(userOut)
    })
}, 15000);


server.listen(5000)