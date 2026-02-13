
import { CoworkerSkill } from '../skills/custom/coworker/index.js';
import { SkillExecutionContext } from '../skills/loader.js';

async function main() {
    console.log('Starting Coworker Demo...');

    const skill = new CoworkerSkill();

    // Mock context
    const context: SkillExecutionContext = {
        userId: 'user-123',
        conversationId: 'conv-123',
        message: 'Run the demo',
        parameters: {
            task: 'Go to https://example.com, verify the title is "Example Domain", click the "More information" link, and tell me the title of the new page.',
            context: 'Use browser tools'
        },
        memory: {
            get: async () => null,
            set: async () => { }
        }
    };

    try {
        const result = await skill.execute(context);
        console.log('---------------------------------------------------');
        console.log('Final Result:', result);
    } catch (error) {
        console.error('Demo failed:', error);
    }
}

main();
