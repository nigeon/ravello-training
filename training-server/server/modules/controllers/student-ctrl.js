'use strict';

var _ = require('lodash');
var q = require('q');

var ravelloAuth = require('../auth/ravello-auth');

var coursesDal = require('../dal/courses-dal');
var classesDal = require('../dal/classes-dal');

var classesTrans = require('../trans/classes-trans');
var appsTrans = require('../trans/apps-trans');

var blueprintsService = require('../services/blueprints-service');
var appsService = require('../services/apps-service');

/* --- Private functions --- */

var prepareClassForStudent = function(classEntity, studentId) {
    var classData = classesTrans.entityToDto(classEntity);

    var matchingStudentEntity = null;
    classEntity.students.forEach(function(studentEntity) {
        if (studentEntity.id === studentId) {
            matchingStudentEntity = studentEntity;
        }
    });

    var matchingStudent = matchingStudentEntity.toJSON();

    var bpPermissionsMap = {};
    _.forEach(matchingStudent.blueprintPermissions, function(bpPermissions) {
        var bpPermissionsDto = _.pick(bpPermissions, 'startVms', 'stopVms', 'console');
        bpPermissionsMap[bpPermissions.bpId] = bpPermissionsDto;
    });

    classData.blueprintPermissions = bpPermissionsMap;

    classData = _.omit(classData, 'students');
    return classData;
};

var createVmViewObject = function(vm) {
    var hostnames = _.map(vm.hostnames, function(hostname) {
        return {
            name: hostname
        };
    });

    var allDns = [];
    _.forEach(vm.networkConnections, function(networkConnection) {
        var publicIp = extractDeviceIp(networkConnection);

        if (publicIp) {
            var servicesForNic = [];
            _.forEach(vm.suppliedServices, function(currentService) {
                // Return the service if:
                // 1. It has no ip property (meaning it is for all IPs).
                // 2. OR it has an ip property, and its equal to the current public IP.
                // 3. AND it is defined as external.
                if ((!currentService.hasOwnProperty('ip') || currentService.ip === publicIp) &&
                    currentService.external) {

                    servicesForNic.push({
                        name: currentService.name,
                        port: currentService.externalPort
                    });
                }
            });

            allDns.push({
                name: networkConnection.ipConfig.fqdn,
                services: servicesForNic
            });
        }
    });

    var firstDns = _.find(allDns, function(dns) {
        return (dns && dns.services && dns.services.length > 0);
    });

    var vmViewObject = {
        id: vm.id,
        name: vm.name,
        status: vm.state,
        hostnames: hostnames,
        allDns: allDns,
        firstDns: firstDns
    };

    return vmViewObject;
};

var extractDeviceIp = function(device) {
    if (device.ipConfig) {
        if (device.ipConfig.publicIp) {
            return device.ipConfig.publicIp;
        }

        if (device.ipConfig.autoIpConfig && device.ipConfig.autoIpConfig.reservedIp) {
            return device.ipConfig.autoIpConfig.reservedIp;
        }
    }

    return undefined;
};

/* --- Public functions --- */

exports.getStudentClass = function(request, response) {
    var user = request.user;
    var userId = user.id;

    // When the user logs in, we first need to find the class associated with that user.
    classesDal.getClassOfUser(userId).then(function(classEntity) {
        var classData = classesTrans.entityToDto(classEntity);
        var studentData = classEntity.findStudentByUserId(userId);

        var classPerStudent = prepareClassForStudent(classEntity, studentData.id);

        var userData = user.toJSON();
        userData.userClass = classPerStudent;

        response.json(userData);
    }).fail(function(error) {
        response.send(404, "Could not find the class of student: " + user.username);
    });
};

exports.getStudentClassApps = function(request, response) {
    var user = request.user;
    var userId = user.id;

    // When the user logs in, we first need to find the class associated with that user.
    classesDal.getClassOfUser(userId).then(function(classEntity) {
        var classData = classesTrans.entityToDto(classEntity);
        var studentData = classEntity.findStudentByUserId(userId);

        var ravelloUsername = studentData.ravelloCredentials.username;
        var ravelloPassword = studentData.ravelloCredentials.password;

        coursesDal.getCourse(classEntity.courseId).then(function(course) {

            var appsPromises = [];

            _.forEach(studentData.apps, function(app) {
                var promise = appsService.getApp(app.ravelloId, ravelloUsername, ravelloPassword);
                appsPromises.push(promise);
            });

            q.all(appsPromises).then(function(appsResults) {

                var appViewObjects = [];

                _.forEach(appsResults, function(appResult) {
                    var appViewObject = appsTrans.ravelloObjectToStudentDto(course, appResult.body);
                    appViewObjects.push(appViewObject);
                });

                response.json(appViewObjects);

            }).fail(function(error) {
                response.send(404, "Could not get one of the apps of user: " + user.username);
            } );

        }).fail(function(error) {
            response.send(404, "Could not find the course of student: " + user.username);
        });
    }).fail(function(error) {
            response.send(404, "Could not find the class of student: " + user.username);
    });
};

exports.getAppVms = function(request, response) {
    var user = request.user;
    var userId = user.id;

    var appId = request.params.appId;

    // When the user logs in, we first need to find the class associated with that user.
    classesDal.getClassOfUser(userId).then(function(classEntity) {

        var studentData = classEntity.findStudentByUserId(userId);

        var ravelloUsername = studentData.ravelloCredentials.username;
        var ravelloPassword = studentData.ravelloCredentials.password;

        appsService.getApp(appId, ravelloUsername, ravelloPassword).then(function(appResult) {
            var app = appResult.body;

            var vms = _.map(app.deployment.vms, function(vm) {
                return createVmViewObject(vm);
            });

            var appDto = {
                id: app.id,
                blueprintId: app.baseBlueprintId,
                vms: vms
            };

            response.json(appDto);
        }).fail(function(error) {
            var message = "Could not get application deployment information, error: " + error;
            console.log(message);
            response.send(404, message);
            });
    }).fail(function(error) {
        var message = "Could not load app " + appId + ", error: " + error;
        console.log(message);
        response.send(404, message);
    });
};
