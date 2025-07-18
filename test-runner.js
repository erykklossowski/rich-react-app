import { runDeterministicTest } from './test-deterministic-optimization.js';
import { runParameterConsistencyTest } from './test-parameter-consistency.js';
import { runErrorHandlingTest } from './test-error-handling.js';
import { runViterbiSeedingTests } from './test-viterbi-seeding.js';

// Test suite configuration
const TEST_SUITE = {
  name: 'Single Source of Truth Architecture Test Suite',
  description: 'Comprehensive testing of frontend-backend-API consistency',
  tests: [
    {
      name: 'Viterbi Path Seeding Test',
      description: 'Test that Viterbi path seeding produces deterministic results',
      function: runViterbiSeedingTests,
      priority: 'High',
      category: 'Core Consistency'
    },
    {
      name: 'Deterministic Optimization Test',
      description: 'Test that deterministic optimization produces identical results',
      function: runDeterministicTest,
      priority: 'High',
      category: 'Core Consistency'
    },
    {
      name: 'Parameter Consistency Test',
      description: 'Test parameter handling across different boundary conditions',
      function: runParameterConsistencyTest,
      priority: 'High',
      category: 'Core Consistency'
    },
    {
      name: 'Error Handling Test',
      description: 'Test error handling consistency for invalid inputs and edge cases',
      function: runErrorHandlingTest,
      priority: 'High',
      category: 'Robustness'
    }
  ]
};

// Test runner class
class TestRunner {
  constructor(testSuite) {
    this.testSuite = testSuite;
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(80));
    console.log(`📋 Suite: ${this.testSuite.name}`);
    console.log(`📝 Description: ${this.testSuite.description}`);
    console.log(`🧪 Total Tests: ${this.testSuite.tests.length}`);
    console.log('='.repeat(80));
    
    this.startTime = new Date();
    
    for (const test of this.testSuite.tests) {
      console.log(`\n🧪 RUNNING TEST: ${test.name}`);
      console.log(`📝 Description: ${test.description}`);
      console.log(`🎯 Priority: ${test.priority}`);
      console.log(`📁 Category: ${test.category}`);
      console.log('='.repeat(60));
      
      try {
        const testStartTime = new Date();
        const result = await test.function();
        const testEndTime = new Date();
        const testDuration = testEndTime - testStartTime;
        
        const testResult = {
          name: test.name,
          description: test.description,
          priority: test.priority,
          category: test.category,
          result: result,
          duration: testDuration,
          success: result.success,
          timestamp: testStartTime
        };
        
        this.results.push(testResult);
        
        // Display test result
        if (result.success) {
          console.log(`✅ PASS: ${test.name} completed successfully`);
          console.log(`⏱️  Duration: ${testDuration.getTime()}ms`);
        } else {
          console.log(`❌ FAIL: ${test.name} failed`);
          console.log(`⏱️  Duration: ${testDuration.getTime()}ms`);
        }
        
      } catch (error) {
        console.error(`❌ ERROR: ${test.name} threw an exception:`, error.message);
        
        const testResult = {
          name: test.name,
          description: test.description,
          priority: test.priority,
          category: test.category,
          error: error.message,
          success: false,
          timestamp: new Date()
        };
        
        this.results.push(testResult);
      }
    }
    
    this.endTime = new Date();
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST SUITE REPORT');
    console.log('='.repeat(80));
    
    const totalDuration = this.endTime - this.startTime;
    const passedTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    // Overall summary
    console.log(`📈 OVERALL SUMMARY:`);
    console.log(`   ✅ Passed: ${passedTests.length}/${this.results.length} tests`);
    console.log(`   ❌ Failed: ${failedTests.length}/${this.results.length} tests`);
    console.log(`   ⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`   📅 Started: ${this.startTime.toISOString()}`);
    console.log(`   📅 Finished: ${this.endTime.toISOString()}`);
    
    // Results by category
    console.log(`\n📁 RESULTS BY CATEGORY:`);
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryTests = this.results.filter(r => r.category === category);
      const categoryPassed = categoryTests.filter(r => r.success);
      const categoryFailed = categoryTests.filter(r => !r.success);
      
      console.log(`   📂 ${category}:`);
      console.log(`      ✅ Passed: ${categoryPassed.length}/${categoryTests.length}`);
      console.log(`      ❌ Failed: ${categoryFailed.length}/${categoryTests.length}`);
      
      if (categoryFailed.length > 0) {
        categoryFailed.forEach(test => {
          console.log(`         - ${test.name}: ${test.error || 'Test failed'}`);
        });
      }
    });
    
    // Results by priority
    console.log(`\n🎯 RESULTS BY PRIORITY:`);
    const priorities = ['High', 'Medium', 'Low'];
    
    priorities.forEach(priority => {
      const priorityTests = this.results.filter(r => r.priority === priority);
      if (priorityTests.length > 0) {
        const priorityPassed = priorityTests.filter(r => r.success);
        const priorityFailed = priorityTests.filter(r => !r.success);
        
        console.log(`   🔴 ${priority} Priority:`);
        console.log(`      ✅ Passed: ${priorityPassed.length}/${priorityTests.length}`);
        console.log(`      ❌ Failed: ${priorityFailed.length}/${priorityTests.length}`);
        
        if (priorityFailed.length > 0) {
          priorityFailed.forEach(test => {
            console.log(`         - ${test.name}: ${test.error || 'Test failed'}`);
          });
        }
      }
    });
    
    // Detailed test results
    console.log(`\n📋 DETAILED TEST RESULTS:`);
    this.results.forEach((test, index) => {
      const status = test.success ? '✅ PASS' : '❌ FAIL';
      const duration = test.duration ? `${test.duration.getTime()}ms` : 'N/A';
      
      console.log(`   ${index + 1}. ${status} - ${test.name}`);
      console.log(`      📝 ${test.description}`);
      console.log(`      ⏱️  Duration: ${duration}`);
      
      if (!test.success && test.error) {
        console.log(`      ❌ Error: ${test.error}`);
      }
      
      if (test.result && test.result.totalTests) {
        console.log(`      📊 Test Details: ${test.result.passedTests}/${test.result.totalTests} passed`);
      }
    });
    
    // Final verdict
    console.log(`\n🎯 FINAL VERDICT:`);
    console.log('='.repeat(60));
    
    if (failedTests.length === 0) {
      console.log('🎉 EXCELLENT: All tests passed!');
      console.log('🎉 The single source of truth architecture is working perfectly!');
      console.log('🎉 Frontend, backend, and API are fully consistent!');
    } else if (failedTests.length <= this.results.length * 0.2) {
      console.log('✅ GOOD: Most tests passed!');
      console.log('⚠️  Some issues detected but overall architecture is sound.');
      console.log('🔧 Consider addressing the failed tests for full consistency.');
    } else {
      console.log('⚠️  CONCERNING: Many tests failed!');
      console.log('❌ The single source of truth architecture has significant issues.');
      console.log('🔧 Immediate attention required to fix consistency problems.');
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log('='.repeat(60));
    
    if (failedTests.length === 0) {
      console.log('✅ No immediate action required');
      console.log('✅ Continue monitoring for any regressions');
      console.log('✅ Consider adding more test scenarios');
    } else {
      const highPriorityFailures = failedTests.filter(t => t.priority === 'High');
      const coreConsistencyFailures = failedTests.filter(t => t.category === 'Core Consistency');
      
      if (highPriorityFailures.length > 0) {
        console.log('🔴 HIGH PRIORITY ISSUES:');
        highPriorityFailures.forEach(test => {
          console.log(`   - Fix ${test.name}: ${test.error || 'Test failure'}`);
        });
      }
      
      if (coreConsistencyFailures.length > 0) {
        console.log('🔴 CORE CONSISTENCY ISSUES:');
        coreConsistencyFailures.forEach(test => {
          console.log(`   - Address ${test.name}: ${test.error || 'Consistency failure'}`);
        });
      }
      
      console.log('🔧 GENERAL RECOMMENDATIONS:');
      console.log('   - Review failed test details');
      console.log('   - Implement fixes for identified issues');
      console.log('   - Re-run tests after fixes');
      console.log('   - Consider adding more comprehensive error handling');
    }
    
    return {
      totalTests: this.results.length,
      passedTests: passedTests.length,
      failedTests: failedTests.length,
      totalDuration,
      results: this.results,
      success: failedTests.length === 0
    };
  }

  async runSpecificTest(testName) {
    const test = this.testSuite.tests.find(t => t.name === testName);
    if (!test) {
      throw new Error(`Test "${testName}" not found`);
    }
    
    console.log(`🧪 RUNNING SPECIFIC TEST: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log('='.repeat(60));
    
    try {
      const result = await test.function();
      console.log(`✅ Test completed: ${result.success ? 'PASS' : 'FAIL'}`);
      return result;
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
      throw error;
    }
  }

  async runTestsByCategory(category) {
    const categoryTests = this.testSuite.tests.filter(t => t.category === category);
    if (categoryTests.length === 0) {
      throw new Error(`No tests found for category "${category}"`);
    }
    
    console.log(`🧪 RUNNING TESTS FOR CATEGORY: ${category}`);
    console.log(`📊 Found ${categoryTests.length} tests`);
    console.log('='.repeat(60));
    
    const results = [];
    for (const test of categoryTests) {
      try {
        const result = await test.function();
        results.push({
          name: test.name,
          result: result,
          success: result.success
        });
      } catch (error) {
        results.push({
          name: test.name,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  async runTestsByPriority(priority) {
    const priorityTests = this.testSuite.tests.filter(t => t.priority === priority);
    if (priorityTests.length === 0) {
      throw new Error(`No tests found for priority "${priority}"`);
    }
    
    console.log(`🧪 RUNNING TESTS FOR PRIORITY: ${priority}`);
    console.log(`📊 Found ${priorityTests.length} tests`);
    console.log('='.repeat(60));
    
    const results = [];
    for (const test of priorityTests) {
      try {
        const result = await test.function();
        results.push({
          name: test.name,
          result: result,
          success: result.success
        });
      } catch (error) {
        results.push({
          name: test.name,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner(TEST_SUITE);
  
  if (args.length === 0) {
    // Run all tests
    await runner.runAllTests();
  } else {
    const command = args[0];
    
    switch (command) {
      case 'all':
        await runner.runAllTests();
        break;
        
      case 'test':
        if (args.length < 2) {
          console.error('Usage: node test-runner.js test <test-name>');
          process.exit(1);
        }
        await runner.runSpecificTest(args[1]);
        break;
        
      case 'category':
        if (args.length < 2) {
          console.error('Usage: node test-runner.js category <category-name>');
          process.exit(1);
        }
        await runner.runTestsByCategory(args[1]);
        break;
        
      case 'priority':
        if (args.length < 2) {
          console.error('Usage: node test-runner.js priority <priority-level>');
          process.exit(1);
        }
        await runner.runTestsByPriority(args[1]);
        break;
        
      case 'list':
        console.log('Available tests:');
        TEST_SUITE.tests.forEach((test, index) => {
          console.log(`${index + 1}. ${test.name} (${test.category}, ${test.priority})`);
        });
        break;
        
      default:
        console.error('Unknown command. Available commands:');
        console.error('  all                    - Run all tests');
        console.error('  test <test-name>       - Run specific test');
        console.error('  category <category>    - Run tests by category');
        console.error('  priority <priority>    - Run tests by priority');
        console.error('  list                   - List all available tests');
        process.exit(1);
    }
  }
}

// Run the test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n✅ Test runner completed successfully');
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { TestRunner, TEST_SUITE }; 