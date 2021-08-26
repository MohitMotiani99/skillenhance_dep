var jwt = require('jsonwebtoken')

module.exports = function get_token(user){
    return jwt.sign(user)
}
module.exports = function validate_user(token,user_obj){
    //return jwt.verify(token)
    return true
}