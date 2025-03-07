import React, { useState } from 'react';
import { Card, Button, Form, InputNumber, List, Tag, Typography, Alert, Divider, Tabs, Table } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TrialRunner = ({ 
  experimentName, 
  experimentInfo,
  experimentId, 
  onGetNextTrial, 
  onSubmitResult, 
  onGetParetoFront,
  currentTrial, 
  completedTrials,
  paretoFront 
}) => {
  const [objectiveValues, setObjectiveValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMultiObjective = experimentInfo?.objectives?.length > 1;

  const handleGetNextTrial = async () => {
    setLoading(true);
    await onGetNextTrial();
    setLoading(false);
  };

  const handleObjectiveValueChange = (value, objectiveName) => {
    setObjectiveValues({
      ...objectiveValues,
      [objectiveName]: value
    });
  };

  const canSubmitResults = () => {
    // All objectives must have values
    return experimentInfo?.objectives?.every(obj => 
      objectiveValues[obj.name] !== undefined && objectiveValues[obj.name] !== null
    );
  };

  const handleSubmitResult = async () => {
    if (!canSubmitResults()) return;
    
    setSubmitting(true);
    await onSubmitResult(objectiveValues);
    setObjectiveValues({});  // Reset form
    setSubmitting(false);
  };

  const getParetoFront = async () => {
    if (!isMultiObjective) return;
    
    setLoading(true);
    await onGetParetoFront();
    setLoading(false);
  };

  const renderObjectiveInputs = () => {
    return experimentInfo?.objectives?.map(objective => (
      <Form.Item key={objective.name} label={`${objective.name} ${objective.minimize ? '(Minimize)' : '(Maximize)'}`}>
        <InputNumber 
          value={objectiveValues[objective.name]} 
          onChange={(value) => handleObjectiveValueChange(value, objective.name)} 
          style={{ width: 200 }} 
        />
      </Form.Item>
    ));
  };

  const renderParetoChart = () => {
    if (!isMultiObjective || !paretoFront || paretoFront.length === 0) return null;

    // For simplicity, we'll plot the first two objectives for visualization
    const firstObjective = experimentInfo.objectives[0];
    const secondObjective = experimentInfo.objectives[1];

    const data = paretoFront.map((point, index) => ({
      name: `Solution ${index + 1}`,
      [firstObjective.name]: point.objectives[firstObjective.name],
      [secondObjective.name]: point.objectives[secondObjective.name],
    }));

    return (
      <Card title="Pareto Front Visualization" style={{ marginTop: 16 }}>
        <Text>This chart shows the tradeoff between the first two objectives.</Text>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey={firstObjective.name} 
              name={firstObjective.name} 
              label={{ value: firstObjective.name, position: 'bottom' }} 
            />
            <YAxis 
              type="number" 
              dataKey={secondObjective.name} 
              name={secondObjective.name} 
              label={{ value: secondObjective.name, angle: -90, position: 'left' }} 
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter 
              name="Pareto Front" 
              data={data} 
              fill="#8884d8" 
              shape="circle" 
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderParetoTable = () => {
    if (!isMultiObjective || !paretoFront || paretoFront.length === 0) return null;

    const columns = [
      { title: 'Solution', dataIndex: 'solution', key: 'solution' },
      ...experimentInfo.objectives.map(obj => ({
        title: obj.name,
        dataIndex: ['objectives', obj.name],
        key: obj.name,
        render: value => value.toFixed(4)
      })),
      ...experimentInfo.parameters.map(param => ({
        title: param.name,
        dataIndex: ['parameters', param.name],
        key: param.name,
        render: value => typeof value === 'number' ? value.toFixed(4) : value
      }))
    ];

    const dataSource = paretoFront.map((point, index) => ({
      key: index,
      solution: `Solution ${index + 1}`,
      objectives: point.objectives,
      parameters: point.parameters
    }));

    return (
      <Card title="Pareto Front Solutions" style={{ marginTop: 16 }}>
        <Table 
          dataSource={dataSource} 
          columns={columns} 
          scroll={{ x: 'max-content' }}
          pagination={false}
        />
      </Card>
    );
  };

  return (
    <div>
      <Card title={`Experiment: ${experimentName}`}>
        <Text>
          <strong>Objectives:</strong> {experimentInfo?.objectives?.map(obj => 
            `${obj.name} (${obj.minimize ? 'Minimize' : 'Maximize'})`
          ).join(', ')}
        </Text>
        
        <Divider />
        
        {currentTrial ? (
          <Card type="inner" title={`Trial #${currentTrial.trial_id + 1}`}>
            <Title level={4}>Parameters to test:</Title>
            <List
              itemLayout="horizontal"
              dataSource={Object.entries(currentTrial.parameters)}
              renderItem={([key, value]) => (
                <List.Item>
                  <Text strong>{key}:</Text> <Tag color="blue">{value}</Tag>
                </List.Item>
              )}
            />
            
            <Divider />
            
            <Form layout="vertical">
              {renderObjectiveInputs()}
              
              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleSubmitResult} 
                  loading={submitting}
                  disabled={!canSubmitResults()}
                  icon={<CheckCircleOutlined />}
                >
                  Submit Results
                </Button>
              </Form.Item>
            </Form>
          </Card>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Button 
              type="primary" 
              onClick={handleGetNextTrial}
              loading={loading}
              icon={<ExperimentOutlined />}
              size="large"
            >
              Get Next Trial Parameters
            </Button>
          </div>
        )}
      </Card>
      
      {completedTrials.length > 0 && (
        <Tabs defaultActiveKey="history" style={{ marginTop: 16 }}>
          <TabPane tab="Trial History" key="history">
            <Card>
              <List
                itemLayout="horizontal"
                dataSource={completedTrials}
                renderItem={(trial) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`Trial #${trial.trial_id + 1}`}
                      description={
                        <div>
                          <div>
                            {Object.entries(trial.parameters).map(([key, value]) => (
                              <Tag key={key}>{key}: {value}</Tag>
                            ))}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            {Object.entries(trial.result).map(([key, value]) => (
                              <Tag key={key} color="green">{key}: {value}</Tag>
                            ))}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>
          
          {isMultiObjective && (
            <TabPane tab="Pareto Analysis" key="pareto">
              <Card>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Button 
                    type="primary" 
                    onClick={getParetoFront}
                    loading={loading}
                  >
                    Calculate Pareto Front
                  </Button>
                </div>
                
                {renderParetoChart()}
                {renderParetoTable()}
              </Card>
            </TabPane>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default TrialRunner;