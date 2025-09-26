const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require('express-session');
const mysql = require('mysql');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'MonCodeSecretSession',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Config EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Connexion BDD
const connection = mysql.createConnection({
  host: '192.168.4.1',
  user: 'sqllgiauffret',
  password: 'savary85*',
  database: 'lgiauffret_miniblog',
  ssl: { rejectUnauthorized: false }
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connection ok");
});

// Middleware de protection
function requireLogin(req, res, next) {
  if (!req.session.user) {
    res.render('login', { page: "login" });
  } else {
    next();
  }
}

// Authentification
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const sql = 'SELECT * FROM users WHERE login = ? AND mdp = ?';
  const login = req.body.login ? req.body.login.toString() : "";
  const mdp = req.body.mdp ? req.body.mdp.toString() : "";
  if (login === 'admin' && mdp === 'P@ssw0rd') {
    req.session.user = { login: login };
    res.redirect('/');
  } else {
    res.render('login');
  }
});

// Accueil
app.get('/', requireLogin, afficherAccueil);

// Affichage des articles
function afficherAccueil(req, res) {
  const sql = 'SELECT * FROM article ORDER BY id DESC';
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).send("Erreur M BDD");
    res.render("index", { articles: results, user: req.session.user });
  });
}

// Affichage d'un article et de ses commentaires
app.get("/article/:id", requireLogin, afficherArticle);

function afficherArticle(req, res) {
  const articleId = parseInt(req.params.id);
  const sqlArticle = 'SELECT * FROM article WHERE id = ?';
  const sqlComments = 'SELECT * FROM commentaire WHERE article_id = ? ORDER BY id';

  connection.query(sqlArticle, [articleId], (err, articleResults) => {
    if (err) return res.status(500).send("Erreur Z BDD");
    if (articleResults.length === 0) return res.status(404).send("Article non trouvé");

    connection.query(sqlComments, [articleId], (err, commentResults) => {
      if (err) {
        console.error("Erreur SQL commentaires :", err);
        return res.status(500).send("Erreur Y BDD");
      }
      res.render("article", { article: articleResults[0], comments: commentResults, user: req.session.user });
    });
  });
}

// Formulaire de création d'article
app.get("/new", requireLogin, (req, res) => {
  res.render("new", { user: req.session.user });
});

// Création d'un article
app.post("/new", requireLogin, creerNouvelArticle);

function creerNouvelArticle(req, res) {
  const { title, content } = req.body;
  const sql = 'INSERT INTO article (title, content) VALUES (?, ?)';
  connection.query(sql, [title, content], (err) => {
    if (err) return res.status(500).send("Erreur A BDD");
    res.redirect("/");
  });
}

// Suppression d'un article
app.get("/delete/:id", requireLogin, supprimerArticle);

function supprimerArticle(req, res) {
  const id = parseInt(req.params.id);
  const sql = 'DELETE FROM article WHERE id = ?';
  connection.query(sql, [id], (err) => {
    if (err) return res.status(500).send("Erreur B BDD");
    res.redirect("/");
  });
}

// Ajout d'un commentaire
app.post("/article/:id/comment", requireLogin, ajouterCommentaire);

function ajouterCommentaire(req, res) {
  const articleId = parseInt(req.params.id);
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).send("Auteur et commentaire sont requis.");
  }

  const sqlCheck = 'SELECT * FROM article WHERE id = ?';
  connection.query(sqlCheck, [articleId], (err, results) => {
    if (err) return res.status(500).send("Erreur C BDD");
    if (results.length === 0) return res.status(404).send("Article non trouvé");

    const sql = 'INSERT INTO commentaire (author, comm, article_id) VALUES (?, ?, ?)';
    connection.query(sql, [author, text, articleId], (err) => {
      if (err) return res.status(500).send("Erreur D BDD");
      res.redirect(`/article/${articleId}`);
    });
  });
}

// Lancer serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});