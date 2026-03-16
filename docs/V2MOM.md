# V2MOM — OpenContactRoute

Guided Contact Directory for Members and Providers

## Vision

Health plans interact with a wide range of consumers—including members, providers, employers, brokers, vendors, and partners—who frequently need assistance navigating operational support channels such as claims inquiries, eligibility questions, referrals, credentialing, prior authorization, and appeals. Despite the importance of these interactions, most health plan websites and digital tools rely on static contact pages that present long lists of phone numbers, departments, and instructions without context. This often results in confusion about which department should be contacted, misrouted calls, and frustration for both the consumer seeking assistance and the health plan providing support.

**OpenContactRoute** replaces static contact directories with a guided experience that helps users quickly identify the correct support channel based on who they are, the plan or network they are interacting with, and the type of assistance they need. Instead of searching through long lists of contact information, users follow a short sequence of prompts that leads them directly to the appropriate contact method, including phone numbers, IVR instructions, portal links, email addresses, or other support channels.

For health plans, OpenContactRoute provides a **simple administrative interface to manage and publish structured support pathways** without requiring complex implementations or large operational teams. A small number of administrators can maintain the directory, update contact information as operational changes occur, and ensure that members and providers always receive accurate routing guidance.

OpenContactRoute is built as an **open-source, single-tenant application** that health plans can self-host or have hosted on their behalf. Each deployment is a dedicated instance owned and controlled by the health plan, meaning operational contact data never leaves their environment. The platform is designed to be **lightweight, easy to maintain, and simple to embed into existing digital experiences**, including public websites, provider portals, member portals, and mobile applications.

The commercial model supporting OpenContactRoute's development centers on three areas: **managed hosting** for health plans that prefer a fully operated deployment, **dedicated support** for organizations that require ongoing operational assistance, and **custom feature development** for health plans with unique operational requirements. This model allows the core platform to remain open and accessible while sustaining active development and improvement.

## Values

### Simplicity First

The system should remain easy for health plans to implement, configure, and maintain without requiring complex workflows or large operational teams.

### Improved Consumer Experience

Members, providers, and other users should be able to quickly identify the correct support channel with minimal effort.

### Operational Clarity

Health plans should be able to clearly communicate support pathways for different audiences, networks, and operational topics.

### Low Administrative Overhead

A small number of administrators should be able to maintain the directory with minimal training or ongoing effort.

### Embeddable by Design

OpenContactRoute should be easy for digital teams to embed into websites, portals, and other digital experiences.

### Vendor Neutrality

The solution should support diverse health plan operational structures, including internal teams and delegated vendors such as PBMs, prior authorization vendors, and behavioral health administrators.

### Open Source by Design

OpenContactRoute is developed in the open. The codebase should be straightforward to understand, audit, and contribute to. Health plan IT and security teams should be able to inspect the software they are deploying. Community contributions and generalizable customizations should be welcomed back into the core product.

### Data Sovereignty

Each health plan deployment is a dedicated, isolated instance. Operational contact data, pathway configuration, and usage analytics remain within the health plan's own environment or a managed environment operated exclusively on their behalf.

## Methods

### Develop a Guided Support Experience

Create a simple guided interaction that asks users:

1. **Who they are**
   - Member
   - Provider
   - Employer
   - Broker
   - Vendor/Partner

2. **Which plan or network they are interacting with**
   - Commercial
   - Medicare Advantage
   - Medicaid
   - Marketplace

3. **What type of assistance they need**
   - Claims
   - Eligibility
   - Referrals
   - Prior Authorization
   - Credentialing
   - Appeals
   - Pharmacy

Based on these selections, the system presents the appropriate contact methods and instructions.

### Create a Simple Administrative Interface

Provide an intuitive web-based interface where health plan administrators can manage:

- audiences (member, provider, partner, etc.)
- plan or network categories
- support topics
- contact pathways and instructions

Administrators should be able to update contact information quickly without requiring technical support. The interface should support draft and published states so that changes can be staged before going live, and maintain an audit trail of who made changes and when.

### Build on the MERN Stack

The application is built using MongoDB, Express, React, and Node.js:

- **MongoDB** stores pathway data as structured documents, naturally modeling the nested hierarchy of audiences, plans, topics, and contact methods within a single deployment database
- **Express and Node.js** provide a lightweight REST API that serves both the admin interface and the embeddable consumer widget
- **React** powers both the admin UI and the consumer-facing guided widget as a shared component library

This stack keeps the codebase unified under a single language runtime, lowers the barrier for open-source contributors, and is straightforward for health plan engineering teams to evaluate and operate.

### Package for Simple Deployment

Provide a clean self-hosting path so that any health plan or operator can stand up an instance with minimal effort:

- a `docker-compose.yml` that starts the full application stack (Node/Express API, React frontend, MongoDB) with a single command
- a seed data script that populates a working demo configuration so evaluators can immediately explore the experience
- a managed hosting option for health plans that prefer a fully operated deployment without managing infrastructure themselves
- structured logging, a `/health` endpoint, and clear admin-facing error messaging to support ongoing operations and dedicated support engagements

### Define Structured Support Pathways

Each support pathway will include structured information such as:

- department or support function
- phone number
- IVR navigation instructions
- portal links
- email or fax contact methods
- operational notes or instructions

### Enable Easy Embedding

Allow health plans to embed OpenContactRoute into their digital properties, including:

- public websites
- member portals
- provider portals
- mobile applications
- internal support tools

Embedding should be simple and well-documented so that digital teams can integrate the module quickly. Two embedding approaches should be supported: a hosted iframe for environments with strict content security policies, and a JavaScript widget snippet for teams that need more control over styling. Both should support query-string parameters to pre-select an audience or plan, enabling deep-linking from specific portal pages. The embed URL is versioned from the start to protect health plans from breaking changes as the platform evolves.

Because each deployment is a dedicated instance, the embed always points to the health plan's own environment, which is a meaningful data governance advantage over shared SaaS alternatives.

### Support Flexible Operational Structures

Allow health plans to configure support pathways that may involve:

- internal departments
- regional teams
- delegated vendors
- pharmacy benefit managers
- utilization management vendors
- behavioral health administrators

### Provide Optional Analytics

Offer lightweight analytics that help health plans understand:

- common support topics
- frequently accessed contact pathways
- opportunities to improve support routing

These insights can help optimize provider and member support operations over time.

## Obstacles

### Operational Ownership

Within health plans, responsibility for support information may span multiple teams such as provider relations, call center operations, digital experience teams, and network management.

### Content Governance

Health plans must establish internal processes to ensure contact pathways remain accurate and up to date.

### Digital Integration Coordination

Embedding the directory within existing websites or portals may require coordination with digital teams.

### Organizational Change

Some health plans may be accustomed to maintaining static contact pages and may require a shift toward managing structured support pathways.

### Adoption and Awareness

Members and providers must become aware of the guided contact experience and learn to rely on it instead of searching for phone numbers manually.

### Open-Source Project Sustainability

Maintaining an active open-source project requires ongoing investment in documentation, contributor experience, and community engagement. The commercial model must generate enough revenue to sustain active core development while the open-source community grows.

### Custom Work and Core Alignment

Custom feature development for specific health plans must be managed carefully to avoid fragmenting the codebase. A clear process for evaluating whether custom work can be generalized and contributed back to the core project is needed to keep the platform coherent over time.

### IT and Security Approval

Health plan IT and security teams will need to review the software before deployment. Maintaining a clean, well-documented codebase and a permissive open-source license reduces this friction but does not eliminate it.

## Measures

### Health Plan Adoption

- Number of health plans implementing OpenContactRoute
- Number of digital properties using the module (websites, portals, apps)
- Split between self-hosted and managed hosting deployments

### Commercial Performance

- Number of active managed hosting engagements
- Number of active dedicated support contracts
- Number of custom feature development engagements
- Revenue attributed to each of the three commercial pillars

### Open-Source Community Health

- GitHub stars, forks, and watches
- Number of external contributors
- Number of community-reported issues resolved
- Frequency of releases

### Directory Coverage

- Number of audiences supported
- Number of networks or plan types configured
- Number of support topics defined

### User Engagement

- Number of users interacting with the directory
- Most frequently selected support pathways

### Operational Impact

- Reduction in misrouted support inquiries
- Improved provider and member satisfaction with support routing
- Increased usage of appropriate support channels

### Administrative Efficiency

- Number of administrators managing the directory
- Time required to update contact pathways
- Frequency of updates
