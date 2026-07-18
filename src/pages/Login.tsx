import React from 'react';

export const MyComponent: React.FC = () => {
  return (
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta  charset="UTF-8" />
    <meta  name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KingCloud Login</title>
    
    <link  href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet" />
    
    <style>
    *{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Poppins,sans-serif;
    }
    
    body{
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
    background:#09090b;
    overflow:hidden;
    }
    
    body::before{
    content:"";
    position:absolute;
    width:800px;
    height:800px;
    background:#6d28d9;
    filter:blur(180px);
    opacity:.25;
    animation:move 8s infinite alternate;
    }
    
    body::after{
    content:"";
    position:absolute;
    width:600px;
    height:600px;
    background:#06b6d4;
    filter:blur(180px);
    opacity:.15;
    right:-150px;
    bottom:-150px;
    }
    
    @keyframes move{
    100%{
    transform:translate(150px,-100px);
    }
    }
    
    .card{
    position:relative;
    z-index:5;
    width:420px;
    padding:45px;
    background:rgba(20,20,20,.55);
    backdrop-filter:blur(25px);
    border:1px solid rgba(255,255,255,.08);
    border-radius:30px;
    box-shadow:0 0 50px rgba(0,0,0,.6);
    }
    
    .logo{
    width:80px;
    height:80px;
    margin:auto;
    border-radius:20px;
    background:linear-gradient(135deg,#6366f1,#7c3aed);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:35px;
    color:white;
    box-shadow:0 0 25px rgba(99,102,241,.5);
    margin-bottom:25px;
    }
    
    h2{
    text-align:center;
    color:white;
    font-size:34px;
    font-weight:700;
    }
    
    .subtitle{
    text-align:center;
    font-size:12px;
    letter-spacing:2px;
    text-transform:uppercase;
    color:#818cf8;
    margin-top:10px;
    margin-bottom:35px;
    }
    
    .input{
    margin-bottom:20px;
    }
    
    .input label{
    display:block;
    margin-bottom:8px;
    font-size:13px;
    color:#b4b4b4;
    }
    
    .input input{
    width:100%;
    padding:15px;
    border-radius:14px;
    border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.04);
    color:white;
    font-size:15px;
    outline:none;
    transition:.3s;
    }
    
    .input input:focus{
    border-color:#6366f1;
    box-shadow:0 0 15px rgba(99,102,241,.4);
    }
    
    .options{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:25px;
    font-size:14px;
    }
    
    .options label{
    color:#bbb;
    }
    
    .options a{
    color:#818cf8;
    text-decoration:none;
    }
    
    button{
    width:100%;
    padding:15px;
    border:none;
    border-radius:14px;
    font-size:16px;
    font-weight:600;
    cursor:pointer;
    background:white;
    color:#111827;
    transition:.3s;
    }
    
    button:hover{
    background:#e5e5e5;
    transform:translateY(-2px);
    }
    
    .divider{
    display:flex;
    align-items:center;
    margin:25px 0;
    color:#777;
    font-size:13px;
    }
    
    .divider::before,
    .divider::after{
    content:"";
    flex:1;
    height:1px;
    background:#333;
    }
    
    .divider span{
    padding:0 15px;
    }
    
    .socials{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:15px;
    }
    
    .social{
    padding:14px;
    border-radius:14px;
    background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.08);
    text-align:center;
    color:white;
    cursor:pointer;
    transition:.3s;
    }
    
    .social:hover{
    background:#6366f1;
    }
    
    .footer{
    margin-top:25px;
    text-align:center;
    font-size:14px;
    color:#aaa;
    }
    
    .footer a{
    color:#818cf8;
    text-decoration:none;
    }
    </style>
    
    </head>
    <body>
    
    <div className="card">
    
    <div className="logo">
    🖥
    </div>
    
    <h2>KINGCLOUD</h2>
    
    <div className="subtitle">
    Authenticate to Platform Controls
    </div>
    
    <form>
    
    <div className="input">
    <label>Username</label>
    <input  type="text" placeholder="Enter username" />
    </div>
    
    <div className="input">
    <label>Password</label>
    <input  type="password" placeholder="Enter password" />
    </div>
    
    <div className="options">
    <label>
    <input  type="checkbox" />
     Remember Me
    </label>
    
    <a href="#">Forgot Password?</a>
    </div>
    
    <button>
    Sign In
    </button>
    
    </form>
    
    <div className="divider">
    <span>OR</span>
    </div>
    
    <div className="socials">
    <div className="social">
    Discord Login
    </div>
    
    <div className="social">
    Google Login
    </div>
    </div>
    
    <div className="footer">
    Don't have an account?
    <a href="#">Register</a>
    </div>
    
    </div>
    
    </body>
    </html>
  );
};
