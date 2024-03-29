var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import API from '@aws-amplify/api';
import { ConsoleLogger as Logger, jitteredExponentialRetry, NonRetryableError, } from '@aws-amplify/core';
import Observable from 'zen-observable-ts';
import { DISCARD, isModelFieldType, isTargetNameAssociation, OpType, } from '../../types';
import { exhaustiveCheck, USER } from '../../util';
import { buildGraphQLOperation, createMutationInstanceFromModelOperation, getModelAuthModes, TransformerMutationType, } from '../utils';
var MAX_ATTEMPTS = 10;
var logger = new Logger('DataStore');
var MutationProcessor = /** @class */ (function () {
    function MutationProcessor(schema, storage, userClasses, outbox, modelInstanceCreator, MutationEvent, amplifyConfig, authModeStrategy, conflictHandler, errorHandler) {
        if (amplifyConfig === void 0) { amplifyConfig = {}; }
        this.schema = schema;
        this.storage = storage;
        this.userClasses = userClasses;
        this.outbox = outbox;
        this.modelInstanceCreator = modelInstanceCreator;
        this.MutationEvent = MutationEvent;
        this.amplifyConfig = amplifyConfig;
        this.authModeStrategy = authModeStrategy;
        this.conflictHandler = conflictHandler;
        this.errorHandler = errorHandler;
        this.typeQuery = new WeakMap();
        this.processing = false;
        this.generateQueries();
    }
    MutationProcessor.prototype.generateQueries = function () {
        var _this = this;
        Object.values(this.schema.namespaces).forEach(function (namespace) {
            Object.values(namespace.models)
                .filter(function (_a) {
                var syncable = _a.syncable;
                return syncable;
            })
                .forEach(function (model) {
                var _a = __read(buildGraphQLOperation(namespace, model, 'CREATE'), 1), createMutation = _a[0];
                var _b = __read(buildGraphQLOperation(namespace, model, 'UPDATE'), 1), updateMutation = _b[0];
                var _c = __read(buildGraphQLOperation(namespace, model, 'DELETE'), 1), deleteMutation = _c[0];
                _this.typeQuery.set(model, [
                    createMutation,
                    updateMutation,
                    deleteMutation,
                ]);
            });
        });
    };
    MutationProcessor.prototype.isReady = function () {
        return this.observer !== undefined;
    };
    MutationProcessor.prototype.start = function () {
        var _this = this;
        var observable = new Observable(function (observer) {
            _this.observer = observer;
            _this.resume();
            return function () {
                _this.pause();
            };
        });
        return observable;
    };
    MutationProcessor.prototype.resume = function () {
        return __awaiter(this, void 0, void 0, function () {
            var head, namespaceName, _loop_1, this_1, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.processing || !this.isReady()) {
                            return [2 /*return*/];
                        }
                        this.processing = true;
                        namespaceName = USER;
                        _loop_1 = function () {
                            var model, operation, data, condition, modelConstructor, result, opName, modelDefinition, modelAuthModes, operationAuthModes_1, authModeAttempts_1, authModeRetry_1, error_1, record, hasMore;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        model = head.model, operation = head.operation, data = head.data, condition = head.condition;
                                        modelConstructor = this_1.userClasses[model];
                                        result = void 0;
                                        opName = void 0;
                                        modelDefinition = void 0;
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 4, , 5]);
                                        return [4 /*yield*/, getModelAuthModes({
                                                authModeStrategy: this_1.authModeStrategy,
                                                defaultAuthMode: this_1.amplifyConfig.aws_appsync_authenticationType,
                                                modelName: model,
                                                schema: this_1.schema,
                                            })];
                                    case 2:
                                        modelAuthModes = _b.sent();
                                        operationAuthModes_1 = modelAuthModes[operation.toUpperCase()];
                                        authModeAttempts_1 = 0;
                                        authModeRetry_1 = function () { return __awaiter(_this, void 0, void 0, function () {
                                            var response, error_2;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        _a.trys.push([0, 2, , 4]);
                                                        logger.debug("Attempting mutation with authMode: " + operationAuthModes_1[authModeAttempts_1]);
                                                        return [4 /*yield*/, this.jitteredRetry(namespaceName, model, operation, data, condition, modelConstructor, this.MutationEvent, head, operationAuthModes_1[authModeAttempts_1])];
                                                    case 1:
                                                        response = _a.sent();
                                                        logger.debug("Mutation sent successfully with authMode: " + operationAuthModes_1[authModeAttempts_1]);
                                                        return [2 /*return*/, response];
                                                    case 2:
                                                        error_2 = _a.sent();
                                                        authModeAttempts_1++;
                                                        if (authModeAttempts_1 >= operationAuthModes_1.length) {
                                                            logger.debug("Mutation failed with authMode: " + operationAuthModes_1[authModeAttempts_1 - 1]);
                                                            throw error_2;
                                                        }
                                                        logger.debug("Mutation failed with authMode: " + operationAuthModes_1[authModeAttempts_1 - 1] + ". Retrying with authMode: " + operationAuthModes_1[authModeAttempts_1]);
                                                        return [4 /*yield*/, authModeRetry_1()];
                                                    case 3: return [2 /*return*/, _a.sent()];
                                                    case 4: return [2 /*return*/];
                                                }
                                            });
                                        }); };
                                        return [4 /*yield*/, authModeRetry_1()];
                                    case 3:
                                        _a = __read.apply(void 0, [_b.sent(), 3]), result = _a[0], opName = _a[1], modelDefinition = _a[2];
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_1 = _b.sent();
                                        if (error_1.message === 'Offline' || error_1.message === 'RetryMutation') {
                                            return [2 /*return*/, "continue"];
                                        }
                                        return [3 /*break*/, 5];
                                    case 5:
                                        if (!(result === undefined)) return [3 /*break*/, 7];
                                        logger.debug('done retrying');
                                        return [4 /*yield*/, this_1.storage.runExclusive(function (storage) { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, this.outbox.dequeue(storage)];
                                                        case 1:
                                                            _a.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); })];
                                    case 6:
                                        _b.sent();
                                        return [2 /*return*/, "continue"];
                                    case 7:
                                        record = result.data[opName];
                                        hasMore = false;
                                        return [4 /*yield*/, this_1.storage.runExclusive(function (storage) { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: 
                                                        // using runExclusive to prevent possible race condition
                                                        // when another record gets enqueued between dequeue and peek
                                                        return [4 /*yield*/, this.outbox.dequeue(storage, record, operation)];
                                                        case 1:
                                                            // using runExclusive to prevent possible race condition
                                                            // when another record gets enqueued between dequeue and peek
                                                            _a.sent();
                                                            return [4 /*yield*/, this.outbox.peek(storage)];
                                                        case 2:
                                                            hasMore = (_a.sent()) !== undefined;
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); })];
                                    case 8:
                                        _b.sent();
                                        this_1.observer.next({
                                            operation: operation,
                                            modelDefinition: modelDefinition,
                                            model: record,
                                            hasMore: hasMore,
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _b.label = 1;
                    case 1:
                        _a = this.processing;
                        if (!_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.outbox.peek(this.storage)];
                    case 2:
                        _a = (head = _b.sent()) !== undefined;
                        _b.label = 3;
                    case 3:
                        if (!_a) return [3 /*break*/, 5];
                        return [5 /*yield**/, _loop_1()];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 1];
                    case 5:
                        // pauses itself
                        this.pause();
                        return [2 /*return*/];
                }
            });
        });
    };
    MutationProcessor.prototype.jitteredRetry = function (namespaceName, model, operation, data, condition, modelConstructor, MutationEvent, mutationEvent, authMode) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, jitteredExponentialRetry(function (model, operation, data, condition, modelConstructor, MutationEvent, mutationEvent) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, query, variables, graphQLCondition, opName, modelDefinition, tryWith, attempt, opType, result, err_1, _b, error, _c, _d, code, retryWith, err_2, _e, _f, opName_1, query_1, serverData, namespace, updatedMutation;
                            var _g;
                            return __generator(this, function (_h) {
                                switch (_h.label) {
                                    case 0:
                                        _a = __read(this.createQueryVariables(namespaceName, model, operation, data, condition), 5), query = _a[0], variables = _a[1], graphQLCondition = _a[2], opName = _a[3], modelDefinition = _a[4];
                                        tryWith = { query: query, variables: variables, authMode: authMode };
                                        attempt = 0;
                                        opType = this.opTypeFromTransformerOperation(operation);
                                        _h.label = 1;
                                    case 1:
                                        _h.trys.push([1, 3, , 15]);
                                        return [4 /*yield*/, API.graphql(tryWith)];
                                    case 2:
                                        result = (_h.sent());
                                        return [2 /*return*/, [result, opName, modelDefinition]];
                                    case 3:
                                        err_1 = _h.sent();
                                        if (!(err_1.errors && err_1.errors.length > 0)) return [3 /*break*/, 13];
                                        _b = __read(err_1.errors, 1), error = _b[0];
                                        _c = error.originalError, _d = (_c === void 0 ? {} : _c).code, code = _d === void 0 ? null : _d;
                                        if (error.errorType === 'Unauthorized') {
                                            throw new NonRetryableError('Unauthorized');
                                        }
                                        if (error.message === 'Network Error' ||
                                            code === 'ECONNABORTED' // refers to axios timeout error caused by device's bad network condition
                                        ) {
                                            if (!this.processing) {
                                                throw new NonRetryableError('Offline');
                                            }
                                            // TODO: Check errors on different env (react-native or other browsers)
                                            throw new Error('Network Error');
                                        }
                                        if (!(error.errorType === 'ConflictUnhandled')) return [3 /*break*/, 11];
                                        // TODO: add on ConflictConditionalCheck error query last from server
                                        attempt++;
                                        retryWith = void 0;
                                        if (!(attempt > MAX_ATTEMPTS)) return [3 /*break*/, 4];
                                        retryWith = DISCARD;
                                        return [3 /*break*/, 7];
                                    case 4:
                                        _h.trys.push([4, 6, , 7]);
                                        return [4 /*yield*/, this.conflictHandler({
                                                modelConstructor: modelConstructor,
                                                localModel: this.modelInstanceCreator(modelConstructor, variables.input),
                                                remoteModel: this.modelInstanceCreator(modelConstructor, error.data),
                                                operation: opType,
                                                attempts: attempt,
                                            })];
                                    case 5:
                                        retryWith = _h.sent();
                                        return [3 /*break*/, 7];
                                    case 6:
                                        err_2 = _h.sent();
                                        logger.warn('conflict trycatch', err_2);
                                        return [3 /*break*/, 15];
                                    case 7:
                                        if (!(retryWith === DISCARD)) return [3 /*break*/, 9];
                                        _e = __read(buildGraphQLOperation(this.schema.namespaces[namespaceName], modelDefinition, 'GET'), 1), _f = __read(_e[0], 3), opName_1 = _f[1], query_1 = _f[2];
                                        return [4 /*yield*/, API.graphql({
                                                query: query_1,
                                                variables: { id: variables.input.id },
                                                authMode: authMode,
                                            })];
                                    case 8:
                                        serverData = _h.sent();
                                        return [2 /*return*/, [serverData, opName_1, modelDefinition]];
                                    case 9:
                                        namespace = this.schema.namespaces[namespaceName];
                                        updatedMutation = createMutationInstanceFromModelOperation(namespace.relationships, modelDefinition, opType, modelConstructor, retryWith, graphQLCondition, MutationEvent, this.modelInstanceCreator, mutationEvent.id);
                                        return [4 /*yield*/, this.storage.save(updatedMutation)];
                                    case 10:
                                        _h.sent();
                                        throw new NonRetryableError('RetryMutation');
                                    case 11:
                                        try {
                                            this.errorHandler({
                                                localModel: this.modelInstanceCreator(modelConstructor, variables.input),
                                                message: error.message,
                                                operation: operation,
                                                errorType: error.errorType,
                                                errorInfo: error.errorInfo,
                                                remoteModel: error.data
                                                    ? this.modelInstanceCreator(modelConstructor, error.data)
                                                    : null,
                                            });
                                        }
                                        catch (err) {
                                            logger.warn('failed to execute errorHandler', err);
                                        }
                                        finally {
                                            // Return empty tuple, dequeues the mutation
                                            return [2 /*return*/, error.data
                                                    ? [
                                                        { data: (_g = {}, _g[opName] = error.data, _g) },
                                                        opName,
                                                        modelDefinition,
                                                    ]
                                                    : []];
                                        }
                                        _h.label = 12;
                                    case 12: return [3 /*break*/, 14];
                                    case 13: 
                                    // Catch-all for client-side errors that don't come back in the `GraphQLError` format.
                                    // These errors should not be retried.
                                    throw new NonRetryableError(err_1);
                                    case 14: return [3 /*break*/, 15];
                                    case 15:
                                        if (tryWith) return [3 /*break*/, 1];
                                        _h.label = 16;
                                    case 16: return [2 /*return*/];
                                }
                            });
                        }); }, [
                            model,
                            operation,
                            data,
                            condition,
                            modelConstructor,
                            MutationEvent,
                            mutationEvent,
                        ])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MutationProcessor.prototype.createQueryVariables = function (namespaceName, model, operation, data, condition) {
        var modelDefinition = this.schema.namespaces[namespaceName].models[model];
        var queriesTuples = this.typeQuery.get(modelDefinition);
        var _a = __read(queriesTuples.find(function (_a) {
            var _b = __read(_a, 1), transformerMutationType = _b[0];
            return transformerMutationType === operation;
        }), 3), opName = _a[1], query = _a[2];
        var _b = JSON.parse(data), _version = _b._version, parsedData = __rest(_b, ["_version"]);
        var filteredData = operation === TransformerMutationType.DELETE
            ? { id: parsedData.id } // For DELETE mutations, only ID is sent
            : Object.values(modelDefinition.fields)
                .filter(function (_a) {
                var name = _a.name, type = _a.type, association = _a.association;
                // connections
                if (isModelFieldType(type)) {
                    // BELONGS_TO
                    if (isTargetNameAssociation(association) &&
                        association.connectionType === 'BELONGS_TO') {
                        return true;
                    }
                    // All other connections
                    return false;
                }
                if (operation === TransformerMutationType.UPDATE) {
                    // this limits the update mutation input to changed fields only
                    return parsedData.hasOwnProperty(name);
                }
                // scalars and non-model types
                return true;
            })
                .map(function (_a) {
                var name = _a.name, type = _a.type, association = _a.association;
                var fieldName = name;
                var val = parsedData[name];
                if (isModelFieldType(type) &&
                    isTargetNameAssociation(association)) {
                    fieldName = association.targetName;
                    val = parsedData[fieldName];
                }
                return [fieldName, val];
            })
                .reduce(function (acc, _a) {
                var _b = __read(_a, 2), k = _b[0], v = _b[1];
                acc[k] = v;
                return acc;
            }, {});
        // Build mutation variables input object
        var input = __assign(__assign({}, filteredData), { _version: _version });
        var graphQLCondition = JSON.parse(condition);
        var variables = __assign({ input: input }, (operation === TransformerMutationType.CREATE
            ? {}
            : {
                condition: Object.keys(graphQLCondition).length > 0
                    ? graphQLCondition
                    : null,
            }));
        return [query, variables, graphQLCondition, opName, modelDefinition];
    };
    MutationProcessor.prototype.opTypeFromTransformerOperation = function (operation) {
        switch (operation) {
            case TransformerMutationType.CREATE:
                return OpType.INSERT;
            case TransformerMutationType.DELETE:
                return OpType.DELETE;
            case TransformerMutationType.UPDATE:
                return OpType.UPDATE;
            case TransformerMutationType.GET: // Intentionally blank
                break;
            default:
                exhaustiveCheck(operation);
        }
    };
    MutationProcessor.prototype.pause = function () {
        this.processing = false;
    };
    return MutationProcessor;
}());
export { MutationProcessor };
//# sourceMappingURL=mutation.js.map