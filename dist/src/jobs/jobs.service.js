"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const firecrawl_service_1 = require("../firecrawl/firecrawl.service");
const email_service_1 = require("../email/email.service");
const hunter_service_1 = require("../hunter/hunter.service");
const apollo_service_1 = require("../apollo/apollo.service");
let JobsService = JobsService_1 = class JobsService {
    prisma;
    firecrawl;
    emailService;
    hunter;
    apollo;
    logger = new common_1.Logger(JobsService_1.name);
    isProcessing = false;
    constructor(prisma, firecrawl, emailService, hunter, apollo) {
        this.prisma = prisma;
        this.firecrawl = firecrawl;
        this.emailService = emailService;
        this.hunter = hunter;
        this.apollo = apollo;
    }
    onModuleInit() {
        setInterval(() => this.processQueue(), 5000);
        this.logger.log('Background job queue processor initialized.');
    }
    async createSearchJob(query, location) {
        const job = await this.prisma.job.create({
            data: {
                type: 'SEARCH',
                query,
                location,
                status: 'PENDING',
            },
        });
        this.logger.log(`Created Search Job: ${job.id} for "${query}" in "${location}"`);
        this.processQueue().catch((err) => this.logger.error('Error triggering queue process:', err));
        return job;
    }
    async createUrlJob(urls) {
        const job = await this.prisma.job.create({
            data: {
                type: 'URL_LIST',
                status: 'PENDING',
            },
        });
        const leadPromises = urls.map((url) => {
            let formattedUrl = url.trim();
            if (!/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = `https://${formattedUrl}`;
            }
            return this.prisma.lead.create({
                data: {
                    jobId: job.id,
                    website: formattedUrl,
                    companyName: 'Pending Scrape...',
                },
            });
        });
        await Promise.all(leadPromises);
        this.logger.log(`Created URL List Job: ${job.id} with ${urls.length} URLs`);
        this.processQueue().catch((err) => this.logger.error('Error triggering queue process:', err));
        return job;
    }
    async findAllJobs() {
        return this.prisma.job.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }
    async findOneJob(id) {
        return this.prisma.job.findUnique({
            where: { id },
            include: {
                leads: {
                    orderBy: { companyName: 'asc' },
                    include: {
                        contacts: true,
                    },
                },
            },
        });
    }
    async findAllLeads(search) {
        if (search) {
            return this.prisma.lead.findMany({
                where: {
                    OR: [
                        { companyName: { contains: search, mode: 'insensitive' } },
                        { website: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    contacts: true,
                    job: {
                        select: { type: true, query: true, location: true },
                    },
                },
            });
        }
        return this.prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                contacts: true,
                job: {
                    select: { type: true, query: true, location: true },
                },
            },
        });
    }
    async deleteJob(id) {
        return this.prisma.job.delete({
            where: { id },
        });
    }
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const job = await this.prisma.job.findFirst({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'asc' },
                include: { leads: true },
            });
            if (!job) {
                this.isProcessing = false;
                return;
            }
            this.logger.log(`Background runner picking up job: ${job.id} (${job.type})`);
            await this.prisma.job.update({
                where: { id: job.id },
                data: { status: 'PROCESSING' },
            });
            if (job.type === 'SEARCH') {
                await this.executeSearchJob(job);
            }
            else {
                await this.executeUrlListJob(job);
            }
        }
        catch (error) {
            this.logger.error('Error in queue processor loop:', error.stack);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async executeSearchJob(job) {
        try {
            const domains = await this.firecrawl.search(job.query, job.location);
            this.logger.log(`Job ${job.id}: Firecrawl search returned ${domains.length} target domains.`);
            if (domains.length === 0) {
                await this.prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'COMPLETED',
                        error: 'No target websites found for the query.',
                    },
                });
                return;
            }
            for (const domain of domains) {
                await this.prisma.lead.create({
                    data: {
                        jobId: job.id,
                        website: domain,
                        companyName: 'Pending Scrape...',
                    },
                });
            }
            const pendingLeads = await this.prisma.lead.findMany({
                where: { jobId: job.id },
            });
            for (const lead of pendingLeads) {
                try {
                    const cachedLead = await this.prisma.lead.findFirst({
                        where: {
                            website: lead.website,
                            companyName: { notIn: ['Pending Scrape...', 'Failed to scrape'] },
                        },
                        orderBy: { createdAt: 'desc' },
                        include: { contacts: true },
                    });
                    if (cachedLead) {
                        this.logger.log(`Found cached scrape result for ${lead.website}. Skipping live crawl.`);
                        const hasEmail = cachedLead.email && cachedLead.email.trim() !== '';
                        if (!hasEmail) {
                            await this.prisma.lead.delete({
                                where: { id: lead.id },
                            });
                        }
                        else {
                            const updatedLead = await this.prisma.lead.update({
                                where: { id: lead.id },
                                data: {
                                    companyName: cachedLead.companyName,
                                    email: cachedLead.email,
                                    phone: cachedLead.phone,
                                    facebook: cachedLead.facebook,
                                    instagram: cachedLead.instagram,
                                    linkedin: cachedLead.linkedin,
                                    twitter: cachedLead.twitter,
                                    address: cachedLead.address,
                                    description: cachedLead.description,
                                },
                            });
                            if (cachedLead.contacts && cachedLead.contacts.length > 0) {
                                for (const cachedContact of cachedLead.contacts) {
                                    await this.prisma.contact.create({
                                        data: {
                                            leadId: lead.id,
                                            name: cachedContact.name,
                                            role: cachedContact.role,
                                            email: cachedContact.email,
                                            linkedin: cachedContact.linkedin,
                                        },
                                    });
                                }
                            }
                            const settings = await this.emailService.getSettings();
                            if (settings.autoRespond && updatedLead.email && updatedLead.email.trim() !== '') {
                                this.emailService.processEmailPipeline(updatedLead.id).catch((err) => this.logger.error(`Failed executing email pipeline: ${err.message}`));
                            }
                        }
                        continue;
                    }
                    const scrapedData = await this.firecrawl.scrape(lead.website);
                    if (job.query && !this.firecrawl.isRelevantToQuery(job.query, scrapedData.description || '', scrapedData.companyName)) {
                        this.logger.warn(`Job ${job.id}: Discarding irrelevant result "${scrapedData.companyName}" (not related to "${job.query}")`);
                        await this.prisma.lead.delete({ where: { id: lead.id } });
                        continue;
                    }
                    const updatedLead = await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            companyName: scrapedData.companyName,
                            email: scrapedData.email || null,
                            phone: scrapedData.phone || null,
                            facebook: scrapedData.facebook || null,
                            instagram: scrapedData.instagram || null,
                            linkedin: scrapedData.linkedin || null,
                            twitter: scrapedData.twitter || null,
                            address: scrapedData.address || null,
                            description: scrapedData.description || null,
                        },
                    });
                    const enrichedContacts = await this.enrichLeadWithContacts(lead.id, lead.website, scrapedData.companyName);
                    const settings = await this.emailService.getSettings();
                    const hasContactsOrEmail = (enrichedContacts && enrichedContacts > 0) || (updatedLead.email && updatedLead.email.trim() !== '');
                    if (settings.autoRespond && hasContactsOrEmail) {
                        try {
                            await this.emailService.processEmailPipeline(updatedLead.id);
                            await new Promise((resolve) => setTimeout(resolve, 4000));
                        }
                        catch (err) {
                            this.logger.error(`Failed executing email pipeline: ${err.message}`);
                        }
                    }
                }
                catch (scrapeErr) {
                    this.logger.error(`Job ${job.id}: Failed to scrape domain ${lead.website} - ${scrapeErr.message}`);
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            companyName: 'Failed to scrape',
                            description: scrapeErr.message,
                        },
                    });
                }
            }
            await this.prisma.job.update({
                where: { id: job.id },
                data: { status: 'COMPLETED' },
            });
            this.logger.log(`Job ${job.id} completed successfully.`);
        }
        catch (err) {
            this.logger.error(`Job ${job.id} failed: ${err.message}`);
            await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    error: err.message,
                },
            });
        }
    }
    async executeUrlListJob(job) {
        try {
            const pendingLeads = await this.prisma.lead.findMany({
                where: { jobId: job.id },
            });
            for (const lead of pendingLeads) {
                try {
                    const cachedLead = await this.prisma.lead.findFirst({
                        where: {
                            website: lead.website,
                            companyName: { notIn: ['Pending Scrape...', 'Failed to scrape'] },
                        },
                        orderBy: { createdAt: 'desc' },
                        include: { contacts: true },
                    });
                    if (cachedLead) {
                        this.logger.log(`Found cached scrape result for ${lead.website}. Skipping live crawl.`);
                        const hasEmail = cachedLead.email && cachedLead.email.trim() !== '';
                        if (!hasEmail) {
                            await this.prisma.lead.delete({
                                where: { id: lead.id },
                            });
                        }
                        else {
                            const updatedLead = await this.prisma.lead.update({
                                where: { id: lead.id },
                                data: {
                                    companyName: cachedLead.companyName,
                                    email: cachedLead.email,
                                    phone: cachedLead.phone,
                                    facebook: cachedLead.facebook,
                                    instagram: cachedLead.instagram,
                                    linkedin: cachedLead.linkedin,
                                    twitter: cachedLead.twitter,
                                    address: cachedLead.address,
                                    description: cachedLead.description,
                                },
                            });
                            if (cachedLead.contacts && cachedLead.contacts.length > 0) {
                                for (const cachedContact of cachedLead.contacts) {
                                    await this.prisma.contact.create({
                                        data: {
                                            leadId: lead.id,
                                            name: cachedContact.name,
                                            role: cachedContact.role,
                                            email: cachedContact.email,
                                            linkedin: cachedContact.linkedin,
                                        },
                                    });
                                }
                            }
                            const settings = await this.emailService.getSettings();
                            if (settings.autoRespond && updatedLead.email && updatedLead.email.trim() !== '') {
                                this.emailService.processEmailPipeline(updatedLead.id).catch((err) => this.logger.error(`Failed executing email pipeline: ${err.message}`));
                            }
                        }
                        continue;
                    }
                    const scrapedData = await this.firecrawl.scrape(lead.website);
                    const updatedLead = await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            companyName: scrapedData.companyName,
                            email: scrapedData.email || null,
                            phone: scrapedData.phone || null,
                            facebook: scrapedData.facebook || null,
                            instagram: scrapedData.instagram || null,
                            linkedin: scrapedData.linkedin || null,
                            twitter: scrapedData.twitter || null,
                            address: scrapedData.address || null,
                            description: scrapedData.description || null,
                        },
                    });
                    const enrichedContacts2 = await this.enrichLeadWithContacts(lead.id, lead.website, scrapedData.companyName);
                    const settings = await this.emailService.getSettings();
                    const hasContactsOrEmail2 = (enrichedContacts2 > 0) || (updatedLead.email && updatedLead.email.trim() !== '');
                    if (settings.autoRespond && hasContactsOrEmail2) {
                        try {
                            await this.emailService.processEmailPipeline(updatedLead.id);
                            await new Promise((resolve) => setTimeout(resolve, 4000));
                        }
                        catch (err) {
                            this.logger.error(`Failed executing email pipeline: ${err.message}`);
                        }
                    }
                }
                catch (scrapeErr) {
                    this.logger.error(`Job ${job.id}: Failed to scrape domain ${lead.website} - ${scrapeErr.message}`);
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            companyName: 'Failed to scrape',
                            description: scrapeErr.message,
                        },
                    });
                }
            }
            await this.prisma.job.update({
                where: { id: job.id },
                data: { status: 'COMPLETED' },
            });
            this.logger.log(`Job ${job.id} completed successfully.`);
        }
        catch (err) {
            this.logger.error(`Job ${job.id} failed: ${err.message}`);
            await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    error: err.message,
                },
            });
        }
    }
    async enrichLeadWithContacts(leadId, domain, companyName) {
        try {
            this.logger.log(`Enriching Lead ${leadId} (${companyName}) with contacts from Hunter.io + Apollo.io...`);
            const [hunterContacts, apolloContacts] = await Promise.all([
                this.hunter.findContacts(domain).catch((err) => {
                    this.logger.warn(`Hunter.io failed for ${domain}: ${err.message}`);
                    return [];
                }),
                this.apollo.findContacts(domain).catch((err) => {
                    this.logger.warn(`Apollo.io failed for ${domain}: ${err.message}`);
                    return [];
                }),
            ]);
            const seen = new Set();
            const mergedContacts = [...hunterContacts, ...apolloContacts].filter((c) => {
                const key = c.email.toLowerCase();
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
            this.logger.log(`Hunter: ${hunterContacts.length}, Apollo: ${apolloContacts.length}, ` +
                `Merged unique: ${mergedContacts.length} contacts for ${companyName}`);
            if (mergedContacts.length > 0) {
                let linkedinUrls = [];
                try {
                    linkedinUrls = await this.firecrawl.search(`site:linkedin.com/in/ "${companyName}"`, '');
                }
                catch (searchErr) {
                    this.logger.warn(`LinkedIn search failed for ${companyName}: ${searchErr.message}`);
                }
                for (const contact of mergedContacts) {
                    let matchedLinkedinUrl = null;
                    if (linkedinUrls.length > 0) {
                        matchedLinkedinUrl = linkedinUrls.find((url) => {
                            const cleanUrl = url.toLowerCase();
                            const nameParts = contact.name.toLowerCase().split(/\s+/);
                            return nameParts.every((part) => part.length > 2 && cleanUrl.includes(part));
                        }) || null;
                    }
                    await this.prisma.contact.create({
                        data: {
                            leadId,
                            name: contact.name,
                            role: contact.role,
                            email: contact.email,
                            linkedin: matchedLinkedinUrl,
                        },
                    });
                }
                this.logger.log(`Saved ${mergedContacts.length} unique contacts for Lead ${leadId}.`);
            }
            return mergedContacts.length;
        }
        catch (err) {
            this.logger.error(`Failed to enrich lead ${leadId} with contacts: ${err.message}`, err.stack);
            return 0;
        }
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        firecrawl_service_1.FirecrawlService,
        email_service_1.EmailService,
        hunter_service_1.HunterService,
        apollo_service_1.ApolloService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map