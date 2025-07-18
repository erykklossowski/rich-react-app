# Comprehensive Test Scenarios for Single Source of Truth Architecture

## 🎯 **Test Objective**
Validate that frontend minus backend equals zero for ALL variables, parameters, and function results across various scenarios.

---

## 📋 **Test Scenario Categories**

### **1. Deterministic Optimization Tests**
*Goal: Ensure consistent results when optimization is made deterministic*

#### **1.1 Seeded Random Number Test**
```javascript
// Test with fixed random seed
const TEST_CONFIG_SEEDED = {
  ...TEST_CONFIG,
  randomSeed: 12345 // Add seed to make optimization deterministic
};
```
- **Expected**: Backend = Frontend = API (all identical)
- **Validation**: All revenue, cycles, energy values match exactly

#### **1.2 Simple Optimization Test**
```javascript
// Test with simple optimization (no differential evolution)
const TEST_CONFIG_SIMPLE = {
  ...TEST_CONFIG,
  optimizationMethod: 'simple' // Use simple optimization instead of DE
};
```
- **Expected**: Deterministic results across all three runs
- **Validation**: No random differences

---

### **2. Parameter Consistency Tests**
*Goal: Verify parameter passing and processing consistency*

#### **2.1 Parameter Boundary Tests**
```javascript
const BOUNDARY_TESTS = [
  { batteryCapacity: 0.1, maxPower: 0.1, efficiency: 0.5 }, // Minimum values
  { batteryCapacity: 100, maxPower: 50, efficiency: 0.99 }, // Maximum values
  { batteryCapacity: 10, maxPower: 10, efficiency: 0.9 },   // Equal capacity/power
  { batteryCapacity: 5, maxPower: 10, efficiency: 0.9 },    // Power > Capacity (invalid)
];
```
- **Expected**: Same parameter validation and processing
- **Validation**: Identical error handling and results

#### **2.2 SOC Parameter Tests**
```javascript
const SOC_TESTS = [
  { initialSOC: 0, targetSOC: 100 },     // Full discharge to full charge
  { initialSOC: 50, targetSOC: 50 },     // Same SOC
  { initialSOC: 100, targetSOC: 0 },     // Full charge to full discharge
  { initialSOC: 25, targetSOC: 75 },     // Partial range
];
```
- **Expected**: Consistent SOC handling across all systems
- **Validation**: Same initial/target SOC processing

---

### **3. Data Processing Consistency Tests**
*Goal: Verify data loading, filtering, and aggregation consistency*

#### **3.1 Date Range Tests**
```javascript
const DATE_RANGE_TESTS = [
  { startDate: '2024-06-14', endDate: '2024-06-15' }, // Single day
  { startDate: '2024-06-14', endDate: '2024-07-14' }, // One month
  { startDate: '2024-06-14', endDate: '2024-12-31' }, // Full range
  { startDate: '2024-12-01', endDate: '2024-12-31' }, // Last month only
];
```
- **Expected**: Same data filtering and month grouping
- **Validation**: Identical monthly groups and record counts

#### **3.2 Data Quality Tests**
```javascript
const DATA_QUALITY_TESTS = [
  // Test with missing data points
  MOCK_DATA_WITH_GAPS,
  // Test with invalid prices (NaN, null, negative)
  MOCK_DATA_WITH_INVALID_PRICES,
  // Test with duplicate timestamps
  MOCK_DATA_WITH_DUPLICATES,
];
```
- **Expected**: Same data validation and cleaning
- **Validation**: Identical data processing results

---

### **4. Optimization Algorithm Tests**
*Goal: Test different optimization methods for consistency*

#### **4.1 Method Comparison Tests**
```javascript
const OPTIMIZATION_METHODS = [
  'simple',           // Simple greedy algorithm
  'differential_evolution', // Current method
  'genetic_algorithm',      // Alternative method
  'particle_swarm',        // Another alternative
];
```
- **Expected**: Same method produces same results
- **Validation**: Method-specific consistency

#### **4.2 Categorization Method Tests**
```javascript
const CATEGORIZATION_METHODS = [
  'quantile',    // Current method
  'kmeans',      // K-means clustering
  'zscore',      // Z-score based
  'volatility',  // Volatility based
  'adaptive',    // Adaptive thresholds
];
```
- **Expected**: Same categorization produces same results
- **Validation**: Price category consistency

---

### **5. Error Handling Tests**
*Goal: Verify consistent error handling across systems*

#### **5.1 Invalid Input Tests**
```javascript
const INVALID_INPUT_TESTS = [
  { batteryCapacity: -1 },           // Negative capacity
  { batteryEfficiency: 1.5 },        // Efficiency > 100%
  { startDate: 'invalid-date' },     // Invalid date format
  { maxPower: 0 },                   // Zero power
  { initialSOC: 150 },               // SOC > 100%
];
```
- **Expected**: Same validation errors
- **Validation**: Identical error messages and handling

#### **5.2 Edge Case Tests**
```javascript
const EDGE_CASE_TESTS = [
  { prices: [] },                    // Empty price array
  { prices: [100] },                 // Single price point
  { prices: [100, 100, 100] },       // All same prices
  { prices: [1, 2, 3, 4, 5] },      // Very small price range
];
```
- **Expected**: Same edge case handling
- **Validation**: Consistent behavior for edge cases

---

### **6. Performance and Scalability Tests**
*Goal: Test consistency under different data sizes*

#### **6.1 Data Size Tests**
```javascript
const DATA_SIZE_TESTS = [
  { size: 24, description: 'One day' },      // 24 hours
  { size: 168, description: 'One week' },   // 7 days
  { size: 720, description: 'One month' },  // 30 days
  { size: 8760, description: 'One year' },  // 365 days
];
```
- **Expected**: Same processing logic regardless of size
- **Validation**: Consistent results across different scales

#### **6.2 Concurrent Request Tests**
```javascript
// Test multiple simultaneous requests
const CONCURRENT_TESTS = [
  // 5 simultaneous identical requests
  // 5 simultaneous different parameter requests
  // Mixed request types
];
```
- **Expected**: No interference between requests
- **Validation**: Each request produces consistent results

---

### **7. Integration Tests**
*Goal: Test the complete system integration*

#### **7.1 End-to-End Tests**
```javascript
const E2E_TESTS = [
  // Frontend form submission → API call → Backend processing → Response
  // Multiple form submissions with different parameters
  // Form validation → API validation → Backend validation
];
```
- **Expected**: Complete flow consistency
- **Validation**: End-to-end data integrity

#### **7.2 State Management Tests**
```javascript
const STATE_TESTS = [
  // Store parameter updates → API parameter passing
  // Results storage → Display consistency
  // Error state handling → UI error display
];
```
- **Expected**: State consistency across frontend and backend
- **Validation**: Parameter and result state integrity

---

### **8. Regression Tests**
*Goal: Ensure fixes don't break existing functionality*

#### **8.1 Known Issue Tests**
```javascript
const REGRESSION_TESTS = [
  // Test the original 550,000 PLN difference issue
  // Test data resolution mismatches
  // Test parameter source inconsistencies
  // Test optimization result sharing
];
```
- **Expected**: Previously fixed issues remain resolved
- **Validation**: No regression of known problems

---

## 🚀 **Implementation Priority**

### **High Priority (Immediate)**
1. **Deterministic Optimization Tests** - Fix the random seed issue
2. **Parameter Consistency Tests** - Validate parameter passing
3. **Error Handling Tests** - Ensure robust error handling

### **Medium Priority (Next Sprint)**
4. **Data Processing Tests** - Validate data consistency
5. **Integration Tests** - Test complete system flow
6. **Regression Tests** - Prevent known issues

### **Low Priority (Future)**
7. **Performance Tests** - Scalability validation
8. **Advanced Algorithm Tests** - Method comparison

---

## 📊 **Success Criteria**

### **Primary Success Criteria**
- ✅ **Backend = API** for all test scenarios
- ✅ **Parameter consistency** across all systems
- ✅ **Error handling consistency** for invalid inputs
- ✅ **Data processing consistency** for all data types

### **Secondary Success Criteria**
- ✅ **Performance consistency** across different data sizes
- ✅ **State management consistency** in frontend
- ✅ **Integration consistency** in end-to-end flows

---

## 🔧 **Test Implementation Strategy**

### **Phase 1: Core Consistency**
1. Implement deterministic optimization tests
2. Add parameter validation tests
3. Create error handling tests

### **Phase 2: Data Integrity**
1. Implement data processing tests
2. Add date range and filtering tests
3. Create data quality tests

### **Phase 3: System Integration**
1. Implement end-to-end tests
2. Add state management tests
3. Create regression tests

### **Phase 4: Advanced Validation**
1. Implement performance tests
2. Add algorithm comparison tests
3. Create scalability tests

---

## 📈 **Expected Outcomes**

### **Immediate Benefits**
- **Consistent Results**: No more random differences between runs
- **Reliable Testing**: Deterministic test outcomes
- **Bug Prevention**: Catch inconsistencies early

### **Long-term Benefits**
- **Maintainable Code**: Clear separation of concerns
- **Scalable Architecture**: Single source of truth
- **Confident Deployments**: Comprehensive test coverage

---

## 🎯 **Next Steps**

1. **Implement deterministic optimization** with fixed random seed
2. **Create automated test suite** for all scenarios
3. **Set up continuous integration** for regression testing
4. **Document test results** and success criteria
5. **Monitor production** for any inconsistencies

This comprehensive test suite will ensure that the single source of truth architecture is robust, reliable, and maintains consistency across all components. 