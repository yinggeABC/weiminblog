var express = require('express');
var utils = require('../utils');
var auth = require('../middleware/auth');
var multer = require("multer");
var upload = multer({dest:"../public/uploads/"});
//创建一个路由容器
var router = express.Router();
//用户注册
//可以在路径和路由之间增加一些中间件函数
router.get('/reg',auth.mustNotLogin,function(req, res, next) {
  res.render('user/reg');
});
//提交用户注册表单
router.post('/reg',auth.mustNotLogin, function(req, res, next) {
  var user = req.body;//user password repassword email
  //如果密码和重复密码不一致，则返回重定向到上一个注册表单页面
  if(user.password != user.repassword){
    return res.redirect('back');
  }
  Model('User').findOne({username:user.username},function(err,result){
    if(result){
      req.flash('error','很抱歉,你的用户名已经被人占用，注册失败');
      //如果失败则滚回到上个页面重新填写
      return res.redirect('back');
    }else{
      //1. 对密码进行md5加密
      user.password = utils.md5(user.password);
      //2. 通过邮箱生成头像
      user.avatar = "https://secure.gravatar.com/avatar/"+utils.md5(user.email)+"?s=28";
      //通过User可以得到模型对象
      Model('User').create(user,function(err,doc){
        //err 错误对象 doc 是保存成功后的对象
        if(err){
          req.flash('error','很抱歉,你注册失败'+err);
          //如果失败则滚回到上个页面重新填写
          return res.redirect('back');
        }else{
          req.flash('success','恭喜你注册成功')
          //如果保存成功了，则把保存后的文档对象写入当前的session中
          req.session.user  = doc;
          //重定向到首页
          return res.redirect('/');
        }
      });
    }
  });

});
//不是完整的路径，而是/users后面的路径
//用户登陆
router.get('/login', function(req, res, next) {
  res.render('user/login');
});
//处理提交登录功能
router.post('/login',auth.mustNotLogin, function(req, res, next) {
  var user = req.body;//先获取请求体 user ={username,password}
  Model('User').findOne({username:user.username},function(err,doc){
      if(err){
        req.flash('error','登录失败');
        res.redirect('back');
      }else{
        if(doc){//意味着有此用户名的用户
          //判断数据库中的用户密码和本次输入的密码是否一致
          if(doc.password == utils.md5(user.password)){
            req.session.user  = doc;
            //重定向到首页
            return res.redirect('/');
          }else{
            req.flash('error','密码输入错误,请重新输入');
            res.redirect('back');
          }
        }else{
          req.flash('error','此用户名不存在');
          res.redirect('back');
        }
      }
  });
});
router.get("/setting",function(req,res){
  res.render("user/setting",{user:req.session.user});
})

router.post("/setting",upload.single("avatar"),function(req,res){
  var user  = req.body;
    if (user.password){
        var nPassword = utils.md5(user.password);
        if (nPassword == req.session.user.password){
            req.flash("error","新密码和旧密码冲突");
        }else{
            req.flash("success","密码修改成功");
          console.log("old",req.session.user.password)
          console.log("new",nPassword)

            Model("User").update({username:req.session.user.username},{$set:{password:nPassword}},function(err){
                if (err){
                    req.flash("error","密码保存失败");
                }else{
                   Model("User").findOne({username:req.session.user.username},function(err,doc){
                     req.session.user=doc;
                   })
                    req.flash("success","密码修改成功");
                }
            })
        }
    }
    if(req.file){
        user.avatar = "/uploads/"+req.file.filename;
        Model("User").update({username:req.session.user.username},{$set:{avatar:user.avatar}},function(err){
            if (err){
                req.flash("error","图片上传失败");
            }else{
                req.session.user.avatar=user.avatar;
                req.flash("success","头像上传成功");
            }
        })
    }
  res.redirect("back")
})
//必须登陆以后才能退出
router.get('/logout',auth.mustLogin,function(req,res){
   req.session.user = null;
   res.redirect('/');
})

//用户退出
router.get('/logout', function(req, res, next) {
  res.send('退出');
});

module.exports = router;
