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
    async createSearchJob(userId, query, location, keywords) {
        const job = await this.prisma.job.create({
            data: {
                userId,
                type: 'SEARCH',
                query,
                location,
                keywords,
                status: 'PENDING',
            },
        });
        this.logger.log(`Created Search Job: ${job.id} for "${query}" in "${location}"`);
        this.processQueue().catch((err) => this.logger.error('Error triggering queue process:', err));
        return job;
    }
    async createUrlJob(userId, urls) {
        const job = await this.prisma.job.create({
            data: {
                userId,
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
    async findAllJobs(userId) {
        return this.prisma.job.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }
    async findOneJob(userId, id) {
        return this.prisma.job.findFirst({
            where: { id, userId },
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
    async findAllLeads(userId, search) {
        const userJobIds = (await this.prisma.job.findMany({
            where: { userId },
            select: { id: true },
        })).map((j) => j.id);
        if (search) {
            return this.prisma.lead.findMany({
                where: {
                    jobId: { in: userJobIds },
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
                    receivedEmails: true,
                    job: {
                        select: { type: true, query: true, location: true },
                    },
                },
            });
        }
        return this.prisma.lead.findMany({
            where: { jobId: { in: userJobIds } },
            orderBy: { createdAt: 'desc' },
            include: {
                contacts: true,
                receivedEmails: true,
                job: {
                    select: { type: true, query: true, location: true },
                },
            },
        });
    }
    async deleteJob(userId, id) {
        const job = await this.prisma.job.findFirst({ where: { id, userId } });
        if (!job)
            return { error: 'Not found or not authorized' };
        return this.prisma.job.delete({
            where: { id },
        });
    }
    async stopJob(userId, id) {
        const job = await this.prisma.job.findFirst({ where: { id, userId } });
        if (!job)
            return { error: 'Not found or not authorized' };
        if (job.status === 'PENDING' || job.status === 'PROCESSING') {
            await this.prisma.job.update({
                where: { id },
                data: {
                    status: 'FAILED',
                    error: 'Stopped by user',
                },
            });
            this.logger.log(`Job ${id} stopped manually by user.`);
        }
        return { success: true };
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
                    const currentJob = await this.prisma.job.findUnique({
                        where: { id: job.id },
                    });
                    if (!currentJob ||
                        currentJob.status === 'FAILED' ||
                        currentJob.status === 'COMPLETED') {
                        this.logger.log(`Job ${job.id} was stopped or failed. Aborting lead scraping loop.`);
                        break;
                    }
                    const cachedLead = await this.prisma.lead.findFirst({
                        where: {
                            website: lead.website,
                            companyName: { notIn: ['Pending Scrape...', 'Failed to scrape'] },
                        },
                        orderBy: { createdAt: 'desc' },
                        include: { contacts: true },
                    });
                    if (cachedLead) {
                        this.logger.log(`Found cached scrape result for ${lead.website}. Filtering contacts...`);
                        let filterKeywords = job.keywords;
                        if (!filterKeywords) {
                            try {
                                const settings = job.userId
                                    ? await this.prisma.settings.findFirst({ where: { userId: job.userId } })
                                    : await this.prisma.settings.findFirst();
                                if (settings && settings.crawlKeywords) {
                                    filterKeywords = settings.crawlKeywords;
                                }
                            }
                            catch { }
                        }
                        let matchingContacts = cachedLead.contacts || [];
                        if (filterKeywords && filterKeywords.trim()) {
                            const titleKeywords = filterKeywords
                                .split(',')
                                .map((k) => k.trim().toLowerCase())
                                .filter(Boolean);
                            if (titleKeywords.length > 0) {
                                matchingContacts = matchingContacts.filter((c) => {
                                    const roleLower = (c.role || '').toLowerCase();
                                    return titleKeywords.some((keyword) => {
                                        if (roleLower.includes(keyword))
                                            return true;
                                        const words = roleLower
                                            .split(/[\s\-\/]+/)
                                            .filter((w) => w && w !== 'of' && w !== 'and' && w !== 'the');
                                        const initials = words.map((w) => w.charAt(0)).join('');
                                        if (initials === keyword || initials.includes(keyword))
                                            return true;
                                        return false;
                                    });
                                });
                            }
                        }
                        if (matchingContacts.length === 0) {
                            this.logger.log(`No matching contacts found in cached lead for ${lead.website}. Discarding lead.`);
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
                            for (const cachedContact of matchingContacts) {
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
                            const settings = await this.emailService.getSettings();
                            if (settings.autoRespond &&
                                updatedLead.email &&
                                updatedLead.email.trim() !== '') {
                                this.emailService
                                    .processEmailPipeline(updatedLead.id)
                                    .catch((err) => this.logger.error(`Failed executing email pipeline: ${err.message}`));
                            }
                        }
                        continue;
                    }
                    const candidateCompanyName = this.getDomainName(lead.website);
                    this.logger.log(`Job ${job.id}: Fetching contacts for ${lead.website} (Candidate: ${candidateCompanyName}) before scraping...`);
                    const enrichedContacts = await this.enrichLeadWithContacts(lead.id, lead.website, candidateCompanyName);
                    if (!enrichedContacts || enrichedContacts === 0) {
                        this.logger.warn(`Job ${job.id}: No target decision-maker contacts found for ${lead.website}. Discarding lead.`);
                        await this.prisma.lead.delete({ where: { id: lead.id } });
                        continue;
                    }
                    this.logger.log(`Job ${job.id}: Decision-maker contacts found. Scraping ${lead.website} now...`);
                    const scrapedData = await this.firecrawl.scrape(lead.website);
                    if (job.query &&
                        !this.firecrawl.isRelevantToQuery(job.query, scrapedData.description || '', scrapedData.companyName)) {
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
                    const settings = await this.emailService.getSettings();
                    const hasContactsOrEmail = (enrichedContacts && enrichedContacts > 0) ||
                        (updatedLead.email && updatedLead.email.trim() !== '');
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
                    this.logger.error(`Job ${job.id}: Failed to process domain ${lead.website} - ${scrapeErr.message}`);
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            companyName: 'Failed to scrape',
                            description: scrapeErr.message,
                        },
                    });
                }
            }
            const finalLeadCount = await this.prisma.lead.count({
                where: { jobId: job.id },
            });
            let statusMsg = null;
            if (finalLeadCount === 0) {
                const attemptedTitle = job.keywords || 'target titles';
                const query = job.query || 'unknown';
                const suggestions = await this.emailService.getAlternativeTitles(query, attemptedTitle);
                statusMsg = `No leads found matching "${attemptedTitle}". AI Suggestion: Try targeting: ${suggestions}`;
            }
            else if (finalLeadCount < 3) {
                statusMsg = `Only ${finalLeadCount} lead${finalLeadCount > 1 ? 's' : ''} found matching your target titles. If you want more results, try adding alternative titles/keywords in the sidebar (e.g. CEO, Director) to expand the search.`;
            }
            await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    error: statusMsg,
                },
            });
            this.logger.log(`Job ${job.id} completed. Status message: ${statusMsg || 'Success (3+ leads)'}`);
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
                    const currentJob = await this.prisma.job.findUnique({
                        where: { id: job.id },
                    });
                    if (!currentJob ||
                        currentJob.status === 'FAILED' ||
                        currentJob.status === 'COMPLETED') {
                        this.logger.log(`Job ${job.id} was stopped or failed. Aborting URL scraping loop.`);
                        break;
                    }
                    const cachedLead = await this.prisma.lead.findFirst({
                        where: {
                            website: lead.website,
                            companyName: { notIn: ['Pending Scrape...', 'Failed to scrape'] },
                        },
                        orderBy: { createdAt: 'desc' },
                        include: { contacts: true },
                    });
                    if (cachedLead) {
                        this.logger.log(`Found cached scrape result for ${lead.website}. Filtering contacts...`);
                        let filterKeywords = job.keywords;
                        if (!filterKeywords) {
                            try {
                                const settings = job.userId
                                    ? await this.prisma.settings.findFirst({ where: { userId: job.userId } })
                                    : await this.prisma.settings.findFirst();
                                if (settings && settings.crawlKeywords) {
                                    filterKeywords = settings.crawlKeywords;
                                }
                            }
                            catch { }
                        }
                        let matchingContacts = cachedLead.contacts || [];
                        if (filterKeywords && filterKeywords.trim()) {
                            const titleKeywords = filterKeywords
                                .split(',')
                                .map((k) => k.trim().toLowerCase())
                                .filter(Boolean);
                            if (titleKeywords.length > 0) {
                                matchingContacts = matchingContacts.filter((c) => {
                                    const roleLower = (c.role || '').toLowerCase();
                                    return titleKeywords.some((keyword) => {
                                        if (roleLower.includes(keyword))
                                            return true;
                                        const words = roleLower
                                            .split(/[\s\-\/]+/)
                                            .filter((w) => w && w !== 'of' && w !== 'and' && w !== 'the');
                                        const initials = words.map((w) => w.charAt(0)).join('');
                                        if (initials === keyword || initials.includes(keyword))
                                            return true;
                                        return false;
                                    });
                                });
                            }
                        }
                        if (matchingContacts.length === 0) {
                            this.logger.log(`No matching contacts found in cached lead for ${lead.website}. Discarding lead.`);
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
                            for (const cachedContact of matchingContacts) {
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
                            const settings = await this.emailService.getSettings();
                            if (settings.autoRespond &&
                                updatedLead.email &&
                                updatedLead.email.trim() !== '') {
                                this.emailService
                                    .processEmailPipeline(updatedLead.id)
                                    .catch((err) => this.logger.error(`Failed executing email pipeline: ${err.message}`));
                            }
                        }
                        continue;
                    }
                    const candidateCompanyName = this.getDomainName(lead.website);
                    this.logger.log(`Job ${job.id}: Fetching contacts for ${lead.website} (Candidate: ${candidateCompanyName}) before scraping...`);
                    const enrichedContacts2 = await this.enrichLeadWithContacts(lead.id, lead.website, candidateCompanyName);
                    if (!enrichedContacts2 || enrichedContacts2 === 0) {
                        this.logger.warn(`Job ${job.id}: No target decision-maker contacts found for ${lead.website}. Discarding lead.`);
                        await this.prisma.lead.delete({ where: { id: lead.id } });
                        continue;
                    }
                    this.logger.log(`Job ${job.id}: Decision-maker contacts found. Scraping ${lead.website} now...`);
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
                    const settings = await this.emailService.getSettings();
                    const hasContactsOrEmail2 = enrichedContacts2 > 0 ||
                        (updatedLead.email && updatedLead.email.trim() !== '');
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
                    this.logger.error(`Job ${job.id}: Failed to process domain ${lead.website} - ${scrapeErr.message}`);
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            companyName: 'Failed to scrape',
                            description: scrapeErr.message,
                        },
                    });
                }
            }
            const finalLeadCount = await this.prisma.lead.count({
                where: { jobId: job.id },
            });
            let statusMsg = null;
            if (finalLeadCount === 0) {
                const attemptedTitle = job.keywords || 'target titles';
                const query = 'this website list';
                const suggestions = await this.emailService.getAlternativeTitles(query, attemptedTitle);
                statusMsg = `No leads found matching "${attemptedTitle}". AI Suggestion: Try targeting: ${suggestions}`;
            }
            else if (finalLeadCount < 3) {
                statusMsg = `Only ${finalLeadCount} lead${finalLeadCount > 1 ? 's' : ''} found matching your target titles. If you want more results, try adding alternative titles/keywords in the sidebar (e.g. CEO, Director) to expand the search.`;
            }
            await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    error: statusMsg,
                },
            });
            this.logger.log(`Job ${job.id} completed. Status message: ${statusMsg || 'Success (3+ leads)'}`);
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
    getDomainName(urlStr) {
        try {
            let formattedUrl = urlStr.trim();
            if (!/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = `https://${formattedUrl}`;
            }
            const url = new URL(formattedUrl);
            const host = url.hostname.replace('www.', '');
            const parts = host.split('.');
            if (parts.length > 0) {
                return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            return urlStr;
        }
        catch (e) {
            return urlStr;
        }
    }
    async enrichLeadWithContacts(leadId, domain, companyName) {
        try {
            this.logger.log(`Enriching Lead ${leadId} (${companyName}) with contacts from Hunter.io + Apollo.io...`);
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: { job: true },
            });
            const userId = lead?.job?.userId || undefined;
            const keywords = lead?.job?.keywords || undefined;
            const [hunterContacts, apolloContacts] = await Promise.all([
                this.hunter.findContacts(domain).catch((err) => {
                    this.logger.warn(`Hunter.io failed for ${domain}: ${err.message}`);
                    return [];
                }),
                this.apollo.findContacts(domain, userId, keywords).catch((err) => {
                    this.logger.warn(`Apollo.io failed for ${domain}: ${err.message}`);
                    return [];
                }),
            ]);
            const seen = new Set();
            let mergedContacts = [...hunterContacts, ...apolloContacts].filter((c) => {
                const key = c.email.toLowerCase();
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
            let filterKeywords = keywords;
            if (!filterKeywords) {
                try {
                    const settings = userId
                        ? await this.prisma.settings.findFirst({ where: { userId } })
                        : await this.prisma.settings.findFirst();
                    if (settings && settings.crawlKeywords) {
                        filterKeywords = settings.crawlKeywords;
                    }
                }
                catch { }
            }
            if (filterKeywords && filterKeywords.trim()) {
                const titleKeywords = filterKeywords
                    .split(',')
                    .map((k) => k.trim().toLowerCase())
                    .filter(Boolean);
                if (titleKeywords.length > 0) {
                    const beforeFilterCount = mergedContacts.length;
                    mergedContacts = mergedContacts.filter((c) => {
                        const roleLower = (c.role || '').toLowerCase();
                        return titleKeywords.some((keyword) => {
                            if (roleLower.includes(keyword))
                                return true;
                            const words = roleLower
                                .split(/[\s\-\/]+/)
                                .filter((w) => w && w !== 'of' && w !== 'and' && w !== 'the');
                            const initials = words.map((w) => w.charAt(0)).join('');
                            if (initials === keyword || initials.includes(keyword))
                                return true;
                            return false;
                        });
                    });
                    this.logger.log(`Filtered contacts by target titles [${titleKeywords.join(', ')}]: kept ${mergedContacts.length} of ${beforeFilterCount} contacts.`);
                }
            }
            this.logger.log(`Hunter: ${hunterContacts.length}, Apollo: ${apolloContacts.length}, ` +
                `Merged unique after filters: ${mergedContacts.length} contacts for ${companyName}`);
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
                        matchedLinkedinUrl =
                            linkedinUrls.find((url) => {
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
                            phone: contact.phone || null,
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