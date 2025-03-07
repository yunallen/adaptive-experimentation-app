import React, { useState } from 'react';
import { Layout, Tabs, Typography } from 'antd';
import ExperimentForm from './components/ExperimentForm';
import TrialRunner from './components/TrialRunner';
import api from './services/api';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

function App() {
  const [experimentId, setExperimentId] = useState(null);
  const [experimentInfo, setExperimentInfo] = useState(null);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [completedTrials, setCompletedTrials] = useState([]);
  const [paretoFront, setParetoFront] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

const handleCreateExperiment = async (experimentData) => {
  try {
    console.log("Creating experiment with data:", experimentData);
    
    // Validate data before sending
    if (!experimentData.name) {
      throw new Error("Experiment name is required");
    }
    
    if (!experimentData.parameters || experimentData.parameters.length === 0) {
      throw new Error("At least one parameter is required");
    }
    
    if (!experimentData.objectives || experimentData.objectives.length === 0) {
      throw new Error("At least one objective is required");
    }
    
    // Make the API call
    const response = await api.createExperiment(experimentData);
    
    console.log("API response:", response);
    
    // Store the experiment info
    setExperimentId(response.experiment_id);
    setExperimentInfo({
      name: experimentData.name,
      objectives: experimentData.objectives,
      parameters: experimentData.parameters
    });
    
    // Switch to the experiment tab
    setActiveTab('2');
  } catch (error) {
    console.error("Error creating experiment:", error);
    alert(`Failed to create experiment: ${error.message || "Unknown error"}`);
  }
};

  const handleGetNextTrial = async () => {
    try {
      const trial = await api.getNextTrial(experimentId);
      setCurrentTrial(trial);
    } catch (error) {
      console.error('Error getting next trial:', error);
    }
  };

  const handleSubmitResult = async (objectiveValues) => {
    try {
      await api.completeTrialResult(experimentId, {
        trial_id: currentTrial.trial_id,
        parameters: currentTrial.parameters,
        objective_values: objectiveValues
      });
      
      // Add to completed trials
      setCompletedTrials([
        ...completedTrials,
        {
          trial_id: currentTrial.trial_id,
          parameters: currentTrial.parameters,
          result: objectiveValues
        }
      ]);
      
      setCurrentTrial(null);
    } catch (error) {
      console.error('Error submitting trial result:', error);
    }
  };

  const handleGetParetoFront = async () => {
    try {
      const pareto = await api.getParetoFront(experimentId);
      setParetoFront(pareto);
    } catch (error) {
      console.error('Error getting Pareto front:', error);
    }
  };

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <Title level={3} style={{ margin: '16px 0' }}>Adaptive Experimentation Platform</Title>
      </Header>
      
      <Content style={{ padding: '24px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Setup Experiment" key="1">
            {!experimentId ? (
              <ExperimentForm onCreateExperiment={handleCreateExperiment} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Title level={4}>Experiment created! Go to "Run Experiment" tab to start trials.</Title>
              </div>
            )}
          </TabPane>
          
          {experimentId && (
            <TabPane tab="Run Experiment" key="2">
              <TrialRunner 
                experimentName={experimentInfo.name}
                experimentInfo={experimentInfo}
                experimentId={experimentId}
                onGetNextTrial={handleGetNextTrial}
                onSubmitResult={handleSubmitResult}
                onGetParetoFront={handleGetParetoFront}
                currentTrial={currentTrial}
                completedTrials={completedTrials}
                paretoFront={paretoFront}
              />
            </TabPane>
          )}
        </Tabs>
      </Content>
    </Layout>
  );
}

export default App;