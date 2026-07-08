import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirecrawlService } from '../firecrawl/firecrawl.service';
import { EmailService } from '../email/email.service';
import { HunterService } from '../hunter/hunter.service';
import { ApolloService } from '../apollo/apollo.service';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private firecrawl: FirecrawlService,
    private emailService: EmailService,
    private hunter: HunterService,
    private apollo: ApolloService,
  ) {}

  onModuleInit() {
    // Start the background worker polling loop
    setInterval(() => this.processQueue(), 5000);
    this.logger.log('Background job queue processor initialized.');
  }

  /**
   * Create a new search-based discovery job (Option 1)
   */
  async createSearchJob(userId: string, query: string, location: string, keywords?: string) {
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
    // Trigger queue processing asynchronously
    this.processQueue().catch((err) =>
      this.logger.error('Error triggering queue process:', err),
    );
    return job;
  }

  /**
   * Create a new direct URL list scraping job (Option 2)
   */
  async createUrlJob(userId: string, urls: string[]) {
    const job = await this.prisma.job.create({
      data: {
        userId,
        type: 'URL_LIST',
        status: 'PENDING',
      },
    });

    // Create preliminary empty lead entries to track URLs that need to be scraped
    const leadPromises = urls.map((url) => {
      // Normalize URL format
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
    
    // Trigger queue processing asynchronously
    this.processQueue().catch((err) =>
      this.logger.error('Error triggering queue process:', err),
    );
    return job;
  }

  /**
   * Get all jobs
   */
  async findAllJobs(userId: string) {
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

  /**
   * Get single job details including its leads
   */
  async findOneJob(userId: string, id: string) {
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

  /**
   * Get all leads with simple search filtering
   */
  async findAllLeads(userId: string, search?: string) {
    const userJobIds = (await this.prisma.job.findMany({
      where: { userId },
      select: { id: true },
    })).map(j => j.id);

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

  /**
   * Delete job and cascaded leads
   */
  async deleteJob(userId: string, id: string) {
    // Ensure the job belongs to this user before deleting
    const job = await this.prisma.job.findFirst({ where: { id, userId } });
    if (!job) return { error: 'Not found or not authorized' };
    return this.prisma.job.delete({
      where: { id },
    });
  }

  /**
   * Background queue processor
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find the next pending job
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
      
      // Update status to PROCESSING
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'PROCESSING' },
      });

      if (job.type === 'SEARCH') {
        await this.executeSearchJob(job);
      } else {
        await this.executeUrlListJob(job);
      }
    } catch (error: any) {
      this.logger.error('Error in queue processor loop:', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process search discovery job
   */
  private async executeSearchJob(job: any) {
    try {
      // 1. Perform Firecrawl search
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

      // 2. Insert blank lead records for the discovered domains
      for (const domain of domains) {
        await this.prisma.lead.create({
          data: {
            jobId: job.id,
            website: domain,
            companyName: 'Pending Scrape...',
          },
        });
      }

      // 3. Scrape websites sequentially to avoid rate limits
      const pendingLeads = await this.prisma.lead.findMany({
        where: { jobId: job.id },
      });

      for (const lead of pendingLeads) {
        try {
          // 1. Check cache
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
            } else {
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

              // Clone contacts from cache
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
                this.emailService.processEmailPipeline(updatedLead.id).catch((err) =>
                  this.logger.error(`Failed executing email pipeline: ${err.message}`),
                );
              }
            }
            continue;
          }

          // 2. Perform live scrape
          const scrapedData = await this.firecrawl.scrape(lead.website);

          // Post-scrape relevance gate: discard leads unrelated to the search query
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

          // Enrich lead with contacts from Hunter.io and Apollo
          const enrichedContacts = await this.enrichLeadWithContacts(lead.id, lead.website, scrapedData.companyName);

          const settings = await this.emailService.getSettings();
          const hasContactsOrEmail = (enrichedContacts && enrichedContacts > 0) || (updatedLead.email && updatedLead.email.trim() !== '');
          if (settings.autoRespond && hasContactsOrEmail) {
            try {
              await this.emailService.processEmailPipeline(updatedLead.id);
              await new Promise((resolve) => setTimeout(resolve, 4000));
            } catch (err: any) {
              this.logger.error(`Failed executing email pipeline: ${err.message}`);
            }
          }
        } catch (scrapeErr: any) {
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

      // Mark Job as COMPLETED
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'COMPLETED' },
      });
      this.logger.log(`Job ${job.id} completed successfully.`);
    } catch (err: any) {
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

  /**
   * Process pre-defined URL list job
   */
  private async executeUrlListJob(job: any) {
    try {
      const pendingLeads = await this.prisma.lead.findMany({
        where: { jobId: job.id },
      });

      for (const lead of pendingLeads) {
        try {
          // 1. Check cache
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
            } else {
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

              // Clone contacts from cache
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
                this.emailService.processEmailPipeline(updatedLead.id).catch((err) =>
                  this.logger.error(`Failed executing email pipeline: ${err.message}`),
                );
              }
            }
            continue;
          }

          // 2. Perform live scrape
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

          // Enrich lead with contacts from Hunter.io and Apollo
          const enrichedContacts2 = await this.enrichLeadWithContacts(lead.id, lead.website, scrapedData.companyName);

          const settings = await this.emailService.getSettings();
          const hasContactsOrEmail2 = (enrichedContacts2 > 0) || (updatedLead.email && updatedLead.email.trim() !== '');
          if (settings.autoRespond && hasContactsOrEmail2) {
            try {
              await this.emailService.processEmailPipeline(updatedLead.id);
              await new Promise((resolve) => setTimeout(resolve, 4000));
            } catch (err: any) {
              this.logger.error(`Failed executing email pipeline: ${err.message}`);
            }
          }
        } catch (scrapeErr: any) {
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

      // Mark Job as COMPLETED
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'COMPLETED' },
      });
      this.logger.log(`Job ${job.id} completed successfully.`);
    } catch (err: any) {
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

  private async enrichLeadWithContacts(leadId: string, domain: string, companyName: string): Promise<number> {
    try {
      this.logger.log(`Enriching Lead ${leadId} (${companyName}) with contacts from Hunter.io + Apollo.io...`);

      // Get the userId from the job associated with the lead
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { job: true },
      });
      const userId = lead?.job?.userId || undefined;
      const keywords = lead?.job?.keywords || undefined;

      // Run both in parallel
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

      // Merge and deduplicate by email (case-insensitive)
      const seen = new Set<string>();
      const mergedContacts = [...hunterContacts, ...apolloContacts].filter((c) => {
        const key = c.email.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.logger.log(
        `Hunter: ${hunterContacts.length}, Apollo: ${apolloContacts.length}, ` +
        `Merged unique: ${mergedContacts.length} contacts for ${companyName}`,
      );

      if (mergedContacts.length > 0) {
        // Try to find LinkedIn profiles for contacts
        let linkedinUrls: string[] = [];
        try {
          linkedinUrls = await this.firecrawl.search(`site:linkedin.com/in/ "${companyName}"`, '');
        } catch (searchErr: any) {
          this.logger.warn(`LinkedIn search failed for ${companyName}: ${searchErr.message}`);
        }

        for (const contact of mergedContacts) {
          let matchedLinkedinUrl: string | null = null;
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
    } catch (err: any) {
      this.logger.error(`Failed to enrich lead ${leadId} with contacts: ${err.message}`, err.stack);
      return 0;
    }
  }
}
