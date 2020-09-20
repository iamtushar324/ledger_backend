const {Router} = require('express')
const route = Router()
const {Users} = require('../../db/db')

route.get('/' , async(req,res) => {
    const users = await Users.findAll({
        attributes : ['id' , 'full_name' , 'email' , 'phone_num' , 'pro_img' , 'createdAt']
    })

    res.send(users)
})

route.put('/suspend' , async(req,res) => {
    try {
        const user = await Users.findOne({
            where : {id : req.query.id}
        })
    
        user.suspended = true
        user.save()
    
        res.send(true)
    } catch (error) {
        res.send(error.message)
    }
   
})

module.exports = {route}