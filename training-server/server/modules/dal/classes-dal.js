'use strict';


var _ = require('lodash');
var mongoose = require('mongoose-q')(require('mongoose'));

var ObjectId = mongoose.Types.ObjectId;

var TrainingClass = mongoose.model('TrainingClass');

exports.getClasses = function() {
    return TrainingClass.find().populate('students.user').execQ();
};

exports.getClass = function(classId) {
    return TrainingClass.findById(classId).populate('students.user').execQ();
};

exports.getClassOfUser = function(userId) {
    return TrainingClass.findOne({'students.user': new ObjectId(userId)}).populate('students.user').execQ();
};

exports.getClassOfUserForNow = function(userId) {
    var now = Date.today().setTimeToNow();

    return TrainingClass.findOne(
        {
            'students.user': new ObjectId(userId),
            'startDate': {
                '$lte': now
            },
            'endDate': {
                '$gte': now
            }
        }
    ).populate('students.user').execQ();
};

exports.createClass = function(classData) {
    var newClass = new TrainingClass(classData);

    return newClass.saveQ().then(
        function(entity) {
            return entity.populateQ('students.user');
        }
    );
};

exports.updateClass = function(classId, classData) {
    var updatedClassEntity = _.omit(classData, '_id');
    updatedClassEntity = _.omit(classData, '__v');
    return TrainingClass.updateQ({_id: new ObjectId(classId)}, updatedClassEntity, {upsert: true});
};

exports.updateStudentApp = function(userId, appId) {
    return TrainingClass.findOne({'students.user': new ObjectId(userId)}).execQ().then(
        function(classEntity) {
            var student = _.find(classEntity.students, function(currentStudent) {
                return currentStudent.user == userId;
            });

            student.apps.push({ravelloId: appId});

            var classData = classEntity.toJSON();
            classData = _.omit(classData, '_id');
            classData = _.omit(classData, '__v');
            return TrainingClass.updateQ({_id: new ObjectId(classEntity.id)}, classData, {upsert: true}).then(
                function(result) {
                    return classEntity;
                }
            );
        }
    );
};

exports.deleteStudentApp = function(userId, appId) {
    return TrainingClass.findOne({'students.user': new ObjectId(userId)}).execQ().then(
        function(classEntity) {
            var student = _.find(classEntity.students, function(currentStudent) {
                return currentStudent.user == userId;
            });

            _.remove(student.apps, {ravelloId: appId});

            var classData = classEntity.toJSON();
            classData = _.omit(classData, '_id');
            classData = _.omit(classData, '__v');
            return TrainingClass.updateQ({_id: new ObjectId(classEntity.id)}, classData, {upsert: true}).then(
                function(result) {
                    return classEntity;
                }
            );
        }
    );
};

exports.deleteClass = function(classId) {
    return TrainingClass.findByIdAndRemove(classId).populate('students.user').execQ();
};
