"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const jobs_service_1 = require("./jobs.service");
const jobs_controller_1 = require("./jobs.controller");
const firecrawl_module_1 = require("../firecrawl/firecrawl.module");
const email_module_1 = require("../email/email.module");
const hunter_module_1 = require("../hunter/hunter.module");
const apollo_module_1 = require("../apollo/apollo.module");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [firecrawl_module_1.FirecrawlModule, email_module_1.EmailModule, hunter_module_1.HunterModule, apollo_module_1.ApolloModule],
        controllers: [jobs_controller_1.JobsController],
        providers: [jobs_service_1.JobsService],
        exports: [jobs_service_1.JobsService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map