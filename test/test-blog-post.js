'use strict';

const chai = require('chai');
const chaiHTTP = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {TEST_DATABASE_URL} = require('../config');
const {app, runServer, closeServer} = require('../server');
const {BlogPosts} = require('../models');

chai.use(chaiHTTP);

function seedBlogPostData(){
	console.info('seeding blog post data');
	const seedData = [];
	for(let i = 1; i <= 10; i++){
		seedData.push({
			author: {
				firstName: faker.name.firstName(),
				lastName: faker.name.lastName()
			},
			title: faker.lorem.sentence(),
			content: faker.lorem.text()
		});
	}
	return BlogPosts.insertMany(seedData);
}

function tearDownDb(){
	console.warn('Deleting Database');
	return mongoose.connection.dropDatabase();
}

describe('Blog Post Api resources', function(){
	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function(){
		return seedBlogPostData();
	});

	afterEach(function(){
		return tearDownDb();
	});

	after(function(){
		return closeServer();
	});

	describe('GET endpoint', function(){

		it('should return all existing Blog posts', function(){
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res){
					res = _res;
					expect(res).to.have.status(200);
					expect(res.body.blogposts).to.have.length.of.at.least(1);
					return BlogPosts.count();
				})
				.then(function(count){
					console.log('there is: ' + count);
					expect(res.body.blogposts.length).to.equal(count);
				});
		});

		it('should return Blog posts with right fields', function(){
			let resBlogs;
			return chai.request(app)
				.get('/posts')
				.then(function(res){
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body.blogposts).to.be.a('array');
					expect(res.body.blogposts).to.have.length.of.at.least(1);

					res.body.blogposts.forEach(function(blogs){
						expect(blogs).to.be.a('object');
						expect(blogs).to.include.keys('id', 'title', 'content', 'author', 'created');
					});
					resBlogs = res.body.blogposts[0];
					return BlogPosts.findById(resBlogs.id);
				})
				.then(function(blogs){
					expect(resBlogs.id).to.equal(blogs.id);
					expect(resBlogs.title).to.equal(blogs.title);
					expect(resBlogs.content).to.equal(blogs.content);
					expect(resBlogs.author).to.equal(blogs.authorName);
				});
		});
	});

	describe('Post endpoint', function(){

		it('should add a new blog post', function(){
			const newPost = {
				author: {
					firstName: faker.name.firstName(),
					lastName: faker.name.lastName()
				},
				title: faker.lorem.sentence(),
				content: faker.lorem.text()
			}
			return chai.request(app)
				.post('/posts')
				.send(newPost)
				.then(function(res){
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys('title', 'content', 'author', 'id', 'created');
					
					expect(res.body.id).to.not.be.null;
					expect(res.body.title).to.equal(newPost.title);
					expect(res.body.content).to.equal(newPost.content);
					expect(res.body.author).to.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
					return BlogPosts.findById(res.body.id);
				})
				.then(function(res){
					expect(res.title).to.equal(newPost.title);
					expect(res.content).to.equal(newPost.content);
					expect(res.author.firstName).to.equal(newPost.author.firstName);
					expect(res.author.lastName).to.equal(newPost.author.lastName);
				})
		});
	});

	describe('PUT endpoint', function(){

		it('should update a blog post by id', function(){
			const updateData = {
				title: "I am an Update",
				content: "UPDATE ME NOW"
			}
			return BlogPosts
				.findOne()
				.then(function(post){
					updateData.id = post.id;
					return chai.request(app)
						.put(`/posts/${updateData.id}`)
						.send(updateData);
				})
				.then(function(res){
					expect(res).to.have.status(204);
					return BlogPosts.findById(updateData.id);
				})
				.then(function(res){
					expect(res.title).to.equal(updateData.title);
					expect(res.content).to.equal(updateData.content);

				})
		});
	});

	describe('DELETE endpoint', function(){

		it('should delete a post by id', function(){
			let deleteData;
			return BlogPosts
				.findOne()
				.then(function(res){
					deleteData = res;
					return chai.request(app)
						.delete(`/posts/${deleteData.id}`);
				})
				.then(function(res){
					expect(res).to.have.status(204);
					return BlogPosts.findById(deleteData.id);
				})
				.then(function(res){
					expect(res).to.be.null;
				});
		});
	});
});